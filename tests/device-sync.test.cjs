/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness loads isolated CommonJS route modules. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadTS(file, overrides = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = (name) => Object.hasOwn(overrides, name) ? overrides[name] : original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}

const helpers = loadTS('lib/device-agent.ts');
function setup() {
  const events = [];
  const changes = [];
  let authorized = true;
  const device = { id: 'pc-one', revoked: false, pcName: 'WORK-PC' };
  const prisma = {
    user: { findUnique: async () => ({ role: 'ADMIN', accountStatus: 'ACTIVE' }) },
    workDevice: {
      findUnique: async () => device,
      update: async ({ where, data }) => { changes.push({ action: 'update', where, data }); return { ...device, ...data }; },
      delete: async ({ where }) => { changes.push({ action: 'delete', where }); return device; },
    },
    workDeviceEvent: {
      findFirst: async ({ where }) => events.find((e) => e.deviceId === where.deviceId && e.source === where.source && e.type === where.type && e.createdAt >= where.createdAt.gte) || null,
      create: async ({ data }) => { const e = { ...data, createdAt: new Date() }; events.push(e); return e; },
      count: async () => 0,
      createMany: async ({ data }) => { events.push(...data); return { count: data.length }; },
      updateMany: async ({ where, data }) => { const e = events.find((e) => e.id === where.id && e.deviceId === where.deviceId && e.source === where.source && e.type === where.type); if (e) Object.assign(e, data); return { count: e ? 1 : 0 }; },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  const dependencies = {
    '@/lib/prisma': { prisma }, '@/lib/device-agent': helpers,
    '@/lib/auth': { auth: async () => authorized ? { user: { id: 'admin' } } : null },
    '@/lib/roles': { ADMIN_ROLES: ['ADMIN'] },
    '@/lib/device-response': loadTS('lib/device-response.ts'),
  };
  return {
    events, device, changes, deny: () => { authorized = false; },
    admin: loadTS('app/api/device-admin/route.ts', dependencies),
    agent: loadTS('app/api/device-agent/route.ts', dependencies),
  };
}
const request = () => new Request('https://hub.test/api/device-admin?id=pc-one', { method: 'PATCH' });
function heartbeat(source = 'WINDOWS', syncRequestId) {
  return new Request('https://hub.test/api/device-agent', { method: 'POST', headers: { authorization: `Bearer ${'a'.repeat(64)}` }, body: JSON.stringify({ source, pcName: 'WORK-PC', consent: true, syncRequestId, events: [{ id: crypto.randomUUID(), type: source === 'WINDOWS' ? 'ACTIVE' : 'REFRESH', platform: source === 'WINDOWS' ? 'Windows' : 'Fiverr' }] }) });
}
test('sync requests require an active admin and an unrevoked PC', async () => {
  const s = setup(); s.deny();
  assert.equal((await s.admin.PATCH(request())).status, 401);
  assert.equal(s.events.length, 0);
  const revoked = setup(); revoked.device.revoked = true;
  assert.equal((await revoked.admin.PATCH(request())).status, 400);
  assert.equal(revoked.events.length, 0);
});
test('sync request is reused, delivered to Windows and acknowledged with a new status', async () => {
  const s = setup();
  const first = await (await s.admin.PATCH(request())).json();
  const repeat = await (await s.admin.PATCH(request())).json();
  assert.equal(first.requestId, repeat.requestId);
  const browser = await (await s.agent.POST(heartbeat('BROWSER'))).json();
  assert.equal(browser.syncRequestId, null);
  const windows = await (await s.agent.POST(heartbeat())).json();
  assert.equal(windows.syncRequestId, first.requestId);
  const ack = await (await s.agent.POST(heartbeat('WINDOWS', first.requestId))).json();
  assert.equal(ack.syncRequestId, null);
  assert.equal(s.events.find((e) => e.id === first.requestId).type, 'SYNCED');
  assert.equal(s.events.filter((e) => e.type === 'ACTIVE').length, 2);
});
test('browser cannot acknowledge Windows sync and acknowledgements cannot modify another device', async () => {
  const s = setup();
  const { requestId } = await (await s.admin.PATCH(request())).json();
  assert.equal((await s.agent.POST(heartbeat('BROWSER', requestId))).status, 400);
  s.events[0].deviceId = 'another-pc';
  await s.agent.POST(heartbeat('WINDOWS', requestId));
  assert.equal(s.events[0].type, 'SYNC_REQUEST');
});
test('rename changes only the display name and validates empty names and malformed JSON', async () => {
  const s = setup();
  const rename = (body) => new Request('https://hub.test/api/device-admin?id=pc-one', { method: 'PUT', body });
  assert.equal((await s.admin.PUT(rename(JSON.stringify({ name: '  Sales PC  ' })))).status, 200);
  assert.deepEqual(s.changes[0], { action: 'update', where: { id: 'pc-one' }, data: { name: 'Sales PC' } });
  assert.equal((await s.admin.PUT(rename(JSON.stringify({ name: '  ' })))).status, 400);
  assert.equal((await s.admin.PUT(rename('{'))).status, 400);
  assert.equal(s.changes.length, 1);
});
test('remove deletes the selected device; ordinary revoke preserves it', async () => {
  const s = setup();
  assert.equal((await s.admin.DELETE(new Request('https://hub.test/api/device-admin?id=pc-one&remove=true', { method: 'DELETE' }))).status, 200);
  assert.deepEqual(s.changes[0], { action: 'delete', where: { id: 'pc-one' } });
  assert.equal((await s.admin.DELETE(new Request('https://hub.test/api/device-admin?id=pc-one', { method: 'DELETE' }))).status, 200);
  assert.deepEqual(s.changes[1].data, { revoked: true, status: 'REVOKED' });
});
test('unauthorized users cannot rename or remove devices', async () => {
  const s = setup(); s.deny();
  assert.equal((await s.admin.PUT(new Request('https://hub.test/api/device-admin?id=pc-one', { method: 'PUT', body: JSON.stringify({ name: 'Changed' }) }))).status, 401);
  assert.equal((await s.admin.DELETE(new Request('https://hub.test/api/device-admin?id=pc-one&remove=true', { method: 'DELETE' }))).status, 401);
  assert.equal(s.changes.length, 0);
});
