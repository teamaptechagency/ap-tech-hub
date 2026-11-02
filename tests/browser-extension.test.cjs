/* eslint-disable @typescript-eslint/no-require-imports -- Node tests execute the real extension worker in an isolated VM. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
async function flush(userAgent, enabled = true, count = 0) {
  const state = { enabled, token: 'a'.repeat(64), pcName: 'WORK-PC', queue: Array.from({ length: count }, () => ({ id: crypto.randomUUID(), type: 'REFRESH', platform: 'Fiverr' })) };
  const sent = [];
  let alarm;
  const noop = () => {};
  const context = vm.createContext({ crypto, URL, AbortSignal, navigator: { userAgent }, chrome: {
    storage: { local: { get: async () => state, set: async (values) => Object.assign(state, values) } },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    webNavigation: { onCommitted: { addListener: noop } },
    runtime: { getManifest: () => ({ version: '0.2.1' }), onMessage: { addListener: noop }, onStartup: { addListener: noop }, onInstalled: { addListener: noop } },
    alarms: { create: noop, onAlarm: { addListener: (fn) => { alarm = fn; } } },
  }, fetch: async (_url, options) => { sent.push(JSON.parse(options.body)); return { ok: true, status: 200 }; } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../desktop-agent/browser-extension/worker.js'), 'utf8'), context);
  await alarm();
  return { sent, state };
}
test('enabled extension reports Chrome or Edge without sending the full user-agent', async () => {
  for (const [ua, expected] of [['Chrome/130.0.0.0', 'Chrome'], ['Chrome/130.0.0.0 Edg/130.0.0.0', 'Edge']]) {
    const { sent } = await flush(ua);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].events[0].platform, expected);
    assert.equal(sent[0].events[0].type, 'HEARTBEAT');
    assert.equal(JSON.stringify(sent).includes(ua), false);
  }
});
test('browser health is included with queued activity and the batch remains bounded', async () => {
  const { sent, state } = await flush('Chrome/130.0.0.0', true, 60);
  assert.equal(sent[0].events.length, 60);
  assert.equal(sent[0].events.filter((event) => event.type === 'HEARTBEAT').length, 1);
  assert.equal(state.queue.length, 1);
});
test('paused extension sends nothing', async () => {
  assert.equal((await flush('Chrome/130.0.0.0', false, 2)).sent.length, 0);
});
