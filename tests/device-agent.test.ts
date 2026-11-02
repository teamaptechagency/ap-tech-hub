import assert from "node:assert/strict";
import test from "node:test";
import { agentBatchSchema, refreshWindow, tokenHash } from "../lib/device-agent";

const batch = {
  source: "BROWSER", pcName: "AP-PC-01", consent: true,
  events: [{ id: "74e98281-2994-455c-b2d7-f3e948bb9f49", type: "REFRESH", platform: "Fiverr" }],
};
test("accepts bounded count-only events", () => {
  const value = agentBatchSchema.parse(batch);
  assert.equal(value.events[0].keys, 0);
  assert.equal(value.events[0].clicks, 0);
});
test("rejects message, clipboard, URL and keystroke-value payloads", () => {
  for (const field of ["message", "clipboard", "url", "key", "text", "password"]) {
    assert.equal(agentBatchSchema.safeParse({ ...batch, events: [{ ...batch.events[0], [field]: "sensitive" }] }).success, false);
  }
  assert.equal(agentBatchSchema.safeParse({ ...batch, screenshot: "data" }).success, false);
});
test("requires explicit consent and bounded batch size", () => {
  assert.equal(agentBatchSchema.safeParse({ ...batch, consent: false }).success, false);
  assert.equal(agentBatchSchema.safeParse({ ...batch, events: [] }).success, false);
  assert.equal(agentBatchSchema.safeParse({ ...batch, events: Array(61).fill(batch.events[0]) }).success, false);
  assert.equal(agentBatchSchema.safeParse({ ...batch, events: [{ ...batch.events[0], keys: -1 }] }).success, false);
});
test("report window rejects reversed and excessive ranges", () => {
  assert.equal(refreshWindow("2026-11-02T10:00:00+06:00", "2026-11-02T09:00:00+06:00"), null);
  assert.equal(refreshWindow("invalid", null), null);
  assert.equal(refreshWindow("2026-01-01T00:00:00Z", "2026-03-01T00:00:00Z"), null);
  const result = refreshWindow("2026-11-02T09:00:00+06:00", "2026-11-02T10:00:00+06:00");
  assert.equal(result?.end.getTime()! - result?.start.getTime()!, 3600000);
});
test("database stores a one-way device token digest", () => {
  assert.equal(tokenHash("abc").length, 64);
  assert.equal(tokenHash("abc"), tokenHash("abc"));
  assert.notEqual(tokenHash("abc"), tokenHash("def"));
});
