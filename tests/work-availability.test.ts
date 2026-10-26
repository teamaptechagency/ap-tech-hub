import assert from "node:assert/strict";
import test from "node:test";
import {
  activeJobWork, activeProfileWork, activeSpecialOrderWork, activeWorkConversation,
  availableJobWhere, availableSpecialOrderWhere, availableConversationWhere,
} from "../lib/work-availability";
import { changeHoldPeriod, readHoldPeriods, workingSeconds } from "../lib/work-hold-periods";

type Row = Record<string, unknown>;
// Evaluate the subset of Prisma's where DSL used by these policies against
// fixtures, without requiring production database credentials.
function matches(row: Row, where: object): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND") return (Array.isArray(value) ? value : [value]).every((part) => matches(row, part));
    if (key === "OR") return value.some((part: object) => matches(row, part));
    if (value && typeof value === "object") {
      if ("is" in value) return row[key] !== null && row[key] !== undefined && matches(row[key] as Row, value.is);
      if ("in" in value) return value.in.includes(row[key]);
      return matches(row[key] as Row, value);
    }
    return row[key] === value;
  });
}

const client = { status: "ACTIVE" };
const profile = { active: true, clientId: "client", client };
const order = { id: "order", clientId: "client", client, profileId: "profile", profile, status: "ACTIVE" };

test("client hold hides its projects while unrelated external work remains available", () => {
  assert.ok(matches({ clientId: "client", client }, activeJobWork));
  assert.equal(matches({ clientId: "client", client: { status: "HOLD" } }, activeJobWork), false);
  assert.ok(matches({ clientId: null, client: null }, activeJobWork));
});

test("profile hold hides its SOs independently of the order's own client", () => {
  assert.ok(matches(order, activeSpecialOrderWork));
  assert.equal(matches({ ...order, profile: { ...profile, active: false } }, activeSpecialOrderWork), false);
  assert.equal(matches({ ...order, profile: { ...profile, client: { status: "HOLD" } } }, activeSpecialOrderWork), false);
});

test("client hold also blocks legacy orders without a profile", () => {
  const legacy = { ...order, profileId: null, profile: null };
  assert.ok(matches(legacy, activeSpecialOrderWork));
  assert.equal(matches({ ...legacy, client: { status: "HOLD" } }, activeSpecialOrderWork), false);
});

test("restoring a client never overrides an independent profile hold", () => {
  const held = { ...profile, active: false, client: { status: "HOLD" } };
  assert.equal(matches({ ...held, client }, activeProfileWork), false);
  assert.ok(matches({ ...held, active: true, client }, activeProfileWork));
});

test("restoration exposes the original order without rewriting its workflow status", () => {
  const original = { ...order, status: "DELIVERED" };
  assert.equal(matches({ ...original, client: { status: "HOLD" } }, activeSpecialOrderWork), false);
  assert.ok(matches(original, activeSpecialOrderWork));
  assert.equal(original.status, "DELIVERED");
});

test("scoped queries preserve IDs, role filters, existing OR and AND conditions", () => {
  const where = availableSpecialOrderWhere({ id: "order", OR: [{ status: "ACTIVE" }, { status: "PLANNED" }], AND: [{ clientId: "client" }] });
  assert.equal(where.id, "order");
  assert.ok(matches(order, where));
  assert.equal(matches({ ...order, id: "other" }, where), false);
  assert.equal(matches({ ...order, clientId: "other" }, where), false);
  assert.equal(matches({ ...order, status: "CANCELLED" }, where), false);
  assert.equal(matches({ id: "job", clientId: "client", client: { status: "HOLD" } }, availableJobWhere({ id: "job" })), false);
});

test("held work chat is blocked while ordinary direct chat remains available", () => {
  const direct = { jobId: null, specialOrderClientId: null, specialOrderPartnerId: null };
  assert.ok(matches(direct, activeWorkConversation));
  assert.equal(matches({ ...direct, specialOrderPartnerId: "order", specialOrderPartner: { ...order, profile: { ...profile, active: false } } }, activeWorkConversation), false);
  assert.equal(matches({ ...direct, jobId: "job", job: { clientId: "client", client: { status: "HOLD" } } }, availableConversationWhere({})), false);
});

const at = (seconds: number) => new Date(seconds * 1000);
test("a running timer excludes hold time after activation without modifying its start", () => {
  let periods = changeHoldPeriod([], false, at(10));
  periods = changeHoldPeriod(periods, false, at(20));
  assert.equal(periods.length, 1);
  assert.equal(workingSeconds(at(0), at(25), periods), 10);
  periods = changeHoldPeriod(periods, true, at(30));
  assert.equal(workingSeconds(at(0), at(50), periods), 30);
  periods = changeHoldPeriod(periods, false, at(60));
  periods = changeHoldPeriod(periods, true, at(70));
  assert.equal(workingSeconds(at(0), at(100), periods), 70);
});

test("hold overlap, out-of-range intervals and malformed settings do not corrupt durations", () => {
  assert.equal(workingSeconds(at(10), at(50), [
    { start: at(0).toISOString(), end: at(20).toISOString() },
    { start: at(15).toISOString(), end: at(30).toISOString() },
    { start: at(100).toISOString(), end: null },
  ]), 20);
  assert.deepEqual(readHoldPeriods("invalid"), []);
  assert.deepEqual(readHoldPeriods('[{"start":"invalid","end":null}]'), []);
});
