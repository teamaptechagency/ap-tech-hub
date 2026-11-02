/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Node route tests without production credentials. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const bcrypt = require('bcryptjs');
function load(file, overrides = {}) {
  const filename = path.resolve(__dirname, '..', file), mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = (name) => Object.hasOwn(overrides, name) ? overrides[name] : original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const attendance = load('lib/device-attendance.ts');
const agent = load('lib/device-agent.ts');
test('night shift crosses midnight and preserves its duty date', () => {
  const now = new Date('2026-11-03T01:00:00+06:00');
  const plan = attendance.plannedShift(now, '23:00');
  assert.equal(attendance.dhakaDay(plan.scheduledStartAt), '2026-11-02');
  assert.equal(plan.scheduledEndAt.toISOString(), '2026-11-03T01:00:00.000Z');
  assert.equal(attendance.lateMinutes(now, '23:00', 10), 110);
});
test('eight-hour requirement excludes breaks, records shortfall and permits overtime', () => {
  const shift = { startedAt: new Date('2026-11-02T07:00:00+06:00'), endedAt: null, breakStartedAt: null, breakSeconds: 1800, scheduledEndAt: new Date('2026-11-02T15:00:00+06:00') };
  const atEnd = attendance.attendanceTotals(shift, shift.scheduledEndAt);
  assert.equal(atEnd.fullAttendance, false); assert.equal(atEnd.shortfallSeconds, 1800);
  assert.equal(attendance.attendanceTotals(shift, new Date('2026-11-02T15:30:00+06:00')).fullAttendance, true);
  assert.equal(attendance.attendanceTotals(shift, new Date('2026-11-02T16:00:00+06:00')).overtimeSeconds, 1800);
});
test('refresh metrics include zero-activity hours and boundary gaps', () => {
  const { deviceMetrics } = load('lib/device-metrics.ts');
  const report = deviceMetrics([], new Date('2026-11-02T01:00:00Z'), new Date('2026-11-02T02:00:00Z'));
  assert.equal(report.expectedMin, 8); assert.equal(report.expectedMax, 12);
  assert.deepEqual(report.hourly, [{ hour: '2026-11-02 07:00', refreshes: 0 }]);
  assert.equal(report.gaps[0].minutes, 60);
});
function setup() {
  const device = { id: 'pc-1', name: 'Work PC', pcName: 'WORK-PC', revoked: false, status: 'ACTIVE' };
  const employee = { id: 'emp-1', code: 'staff-01', name: 'Staff One', status: 'ACTIVE', passwordHash: bcrypt.hashSync('a-long-password', 4), expectedStart: '07:00', graceMinutes: 10, shiftLabel: 'MORNING' };
  let shift = null;
  const tasks = [];
  const writes = [];
  const changes = [];
  const template = { id: 'morning-blog', title: 'Daily blog', shiftLabel: 'MORNING', active: true, primaryEmployeeId: 'emp-1', fallbackEmployeeId: 'emp-2' };
  const prisma = {
    workDevice: { updateMany: async ({ data }) => { writes.push(data); return { count: 1 }; } },
    workDeviceEvent: { count: async () => 0, create: async () => ({}) },
    deviceEmployee: { findUnique: async () => employee, create: async () => ({}) },
    deviceShift: {
      findUnique: async ({ where }) => {
        if (!shift) return null;
        if (where.openEmployeeKey) return shift.openEmployeeKey === where.openEmployeeKey ? shift : null;
        if (where.sessionHash && where.sessionHash !== shift.sessionHash) return null;
        return { ...shift, employee };
      },
      create: async ({ data }) => { shift = { id: 'shift-1', startedAt: new Date(), endedAt: null, breakStartedAt: null, breakSeconds: 0, task: '', handover: '', ...data }; return shift; },
      update: async ({ data }) => { Object.assign(shift, data); return shift; },
      updateMany: async ({ data }) => { Object.assign(shift, data); return { count: 1 }; },
    },
    deviceDailyTemplate: { findMany: async () => [template] },
    deviceDailyTask: {
      createMany: async ({ data }) => { for (const row of data) if (!tasks.find((t) => t.day === row.day && t.templateId === row.templateId)) tasks.push({ id: 'task-1', status: 'PENDING', version: 0, reason: '', done: false, proofUrl: '', ...row }); return { count: data.length }; },
      findMany: async () => tasks,
      findFirst: async ({ where }) => { const found = tasks.find((t) => t.id === where.id && t.day <= where.day.lte); return found ? { ...found, template } : null; },
      updateMany: async ({ where, data }) => { const found = tasks.find((t) => t.id === where.id && t.version === where.version); if (!found) return { count: 0 }; const version = found.version + 1; Object.assign(found, data, { version }); return { count: 1 }; },
    },
    deviceDailyTaskChange: { create: async ({ data }) => { changes.push(data); return data; } },
    $transaction: async (action) => action(prisma),
  };
  const route = load('app/api/device-attendance/route.ts', {
    '@/lib/employee-roster': { effectiveEmployeeShift: async employee => employee, recordedEmployeeShift: async shift => shift },
    '@/lib/prisma': { prisma }, '@/lib/device-access': { credentialDevice: async () => device.revoked ? null : device },
    '@/lib/device-agent': agent, '@/lib/device-attendance': attendance, '@/lib/device-response': load('lib/device-response.ts'),
  });
  const send = (body) => route.POST(new Request('https://hub.test/api/device-attendance', { method: 'POST', body: JSON.stringify({ pcName: 'WORK-PC', ...body }) }));
  return { send, device, employee, template, tasks, writes, changes, getShift: () => shift };
}
test('attendance login, checklist and early logout do not stop activity tracking', async () => {
  const s = setup();
  const login = await (await s.send({ action: 'login', code: 'staff-01', password: 'a-long-password' })).json();
  assert.equal(login.dailyTasks.length, 1); assert.equal(login.sessionToken.length, 64);
  const originalStart = s.getShift().startedAt.getTime();
  const again = await (await s.send({ action: 'login', code: 'staff-01', password: 'a-long-password' })).json();
  assert.equal(s.getShift().startedAt.getTime(), originalStart);
  const token = again.sessionToken;
  assert.equal((await s.send({ action: 'checklist', sessionToken: token, taskId: 'task-1', done: true, proofUrl: 'https://example.com/work' })).status, 200);
  assert.equal(s.tasks[0].done, true);
  assert.equal((await s.send({ action: 'logout', sessionToken: token })).status, 409);
  assert.equal(s.getShift().endedAt, null);
  assert.equal((await s.send({ action: 'logout', sessionToken: token, earlyLeaveReason: 'Medical appointment' })).status, 200);
  assert.equal(s.getShift().endReason, 'EARLY_LOGOUT'); assert.equal(s.getShift().openEmployeeKey, null);
  assert.equal(s.device.status, 'ACTIVE');
  assert.ok(s.writes.every((data) => Object.keys(data).join(',') === 'pcName'));
});
test('pending/revoked accounts and another employee task cannot be used', async () => {
  const s = setup(); s.employee.status = 'PENDING';
  assert.equal((await s.send({ action: 'login', code: 'staff-01', password: 'a-long-password' })).status, 403);
  s.employee.status = 'ACTIVE';
  const login = await (await s.send({ action: 'login', code: 'staff-01', password: 'a-long-password' })).json();
  s.template.primaryEmployeeId = 'another-employee';
  assert.equal((await s.send({ action: 'checklist', sessionToken: login.sessionToken, taskId: 'task-1', done: true })).status, 403);
  s.device.revoked = true;
  assert.equal((await s.send({ action: 'status', sessionToken: login.sessionToken })).status, 401);
});
test('morning holds require a reason; evening takes over the same task and night stays free', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-02T16:00:00+06:00') });
  const s = setup();
  const morning = await (await s.send({ action: 'login', code: 'staff-01', password: 'a-long-password' })).json();
  assert.equal((await s.send({ action: 'checklist', sessionToken: morning.sessionToken, taskId: 'task-1', status: 'HOLD' })).status, 400);
  assert.equal((await s.send({ action: 'checklist', sessionToken: morning.sessionToken, taskId: 'task-1', status: 'HOLD', reason: 'Waiting for ad material' })).status, 200);
  await s.send({ action: 'logout', sessionToken: morning.sessionToken, earlyLeaveReason: 'Test shift handover' });
  Object.assign(s.employee, { id: 'emp-2', code: 'staff-02', shiftLabel: 'EVENING', expectedStart: '15:00' });
  const evening = await (await s.send({ action: 'login', code: 'staff-02', password: 'a-long-password' })).json();
  assert.equal(s.tasks.length, 1); assert.equal(evening.dailyTasks[0].status, 'HOLD');
  assert.equal((await s.send({ action: 'checklist', sessionToken: evening.sessionToken, taskId: 'task-1', status: 'COMPLETED', reason: 'Material received, published' })).status, 200);
  assert.equal(s.tasks[0].completedByEmployeeId, 'emp-2');
  assert.deepEqual(s.changes.map((c) => [c.employeeId, c.toStatus]), [['emp-1', 'HOLD'], ['emp-2', 'COMPLETED']]);
  await s.send({ action: 'logout', sessionToken: evening.sessionToken, earlyLeaveReason: 'Test shift handover' });
  Object.assign(s.employee, { id: 'emp-3', code: 'staff-03', shiftLabel: 'NIGHT', expectedStart: '23:00' });
  const night = await (await s.send({ action: 'login', code: 'staff-03', password: 'a-long-password' })).json();
  assert.deepEqual(night.dailyTasks, []);
  assert.equal((await s.send({ action: 'checklist', sessionToken: night.sessionToken, taskId: 'task-1', status: 'PENDING' })).status, 403);
});
test('cancelled tasks are not handed over and fallback cannot reopen them', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-02T16:00:00+06:00') });
  const s = setup();
  const morning = await (await s.send({ action: 'login', code: 'staff-01', password: 'a-long-password' })).json();
  assert.equal((await s.send({ action: 'checklist', sessionToken: morning.sessionToken, taskId: 'task-1', status: 'CANCELLED', reason: 'No ad campaign today' })).status, 200);
  await s.send({ action: 'logout', sessionToken: morning.sessionToken, earlyLeaveReason: 'Test shift handover' });
  Object.assign(s.employee, { id: 'emp-2', code: 'staff-02', shiftLabel: 'EVENING', expectedStart: '15:00' });
  const evening = await (await s.send({ action: 'login', code: 'staff-02', password: 'a-long-password' })).json();
  assert.deepEqual(evening.dailyTasks, []);
  assert.equal((await s.send({ action: 'checklist', sessionToken: evening.sessionToken, taskId: 'task-1', status: 'PENDING' })).status, 403);
});
test('evening cannot take over before 15:00 or overwrite another worker completion', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-02T10:00:00+06:00') });
  const s = setup();
  const morning = await (await s.send({ action: 'login', code: 'staff-01', password: 'a-long-password' })).json();
  await s.send({ action: 'checklist', sessionToken: morning.sessionToken, taskId: 'task-1', status: 'COMPLETED' });
  await s.send({ action: 'logout', sessionToken: morning.sessionToken, earlyLeaveReason: 'Test handover' });
  Object.assign(s.employee, { id: 'emp-2', code: 'staff-02', shiftLabel: 'EVENING', expectedStart: '15:00' });
  const evening = await (await s.send({ action: 'login', code: 'staff-02', password: 'a-long-password' })).json();
  assert.deepEqual(evening.dailyTasks, []);
  assert.equal((await s.send({ action: 'checklist', sessionToken: evening.sessionToken, taskId: 'task-1', status: 'PENDING' })).status, 403);
  t.mock.timers.setTime(new Date('2026-11-02T16:00:00+06:00').getTime());
  assert.equal((await s.send({ action: 'checklist', sessionToken: evening.sessionToken, taskId: 'task-1', status: 'PENDING' })).status, 409);
  assert.equal(s.tasks[0].completedByEmployeeId, 'emp-1');
});
