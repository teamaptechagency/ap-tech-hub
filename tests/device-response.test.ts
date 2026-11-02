import assert from "node:assert/strict";
import test from "node:test";
import { readDeviceResponse, deviceServiceFailure } from "../lib/device-response";

test("empty failed responses have a useful error instead of JSON parse exceptions", async () => {
  await assert.rejects(readDeviceResponse(new Response("", { status: 500 })), /HTTP 500/);
});
test("HTML responses never leak page markup into the error message", async () => {
  await assert.rejects(readDeviceResponse(new Response("<html>secret</html>", { status: 502 })), (error: Error) => error.message.includes("HTTP 502") && !error.message.includes("secret"));
});
test("expired sessions request sign-in rather than suggesting migrations", async () => {
  await assert.rejects(readDeviceResponse(new Response("", { status: 401 })), /Sign in again/);
});
test("migration failures are returned as specific JSON errors", async () => {
  const failure = deviceServiceFailure({ code: "P2021" });
  assert.equal(failure.code, "DEVICE_SCHEMA_NOT_READY");
  await assert.rejects(readDeviceResponse(Response.json({ error: failure.error }, { status: failure.status })), /npm run db:migrate/);
});
test("successful responses are parsed and malformed successes are rejected", async () => {
  assert.deepEqual(await readDeviceResponse(Response.json({ devices: [] })), { devices: [] });
  await assert.rejects(readDeviceResponse(new Response("")), /invalid response/);
  await assert.rejects(readDeviceResponse(Response.json(null)), /invalid response/);
});
test("internal errors do not reveal database credentials or stack traces", () => {
  const failure = deviceServiceFailure(new Error("postgres://secret"));
  assert.equal(failure.code, "DEVICE_SERVICE_UNAVAILABLE");
  assert.equal(failure.error.includes("secret"), false);
});
