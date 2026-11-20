import test from "node:test";
import assert from "node:assert/strict";
import { startMessagePolling } from "../lib/message-polling";
import { getPusherClient } from "../lib/pusher-client";
import { pusherServer } from "../lib/pusher-server";

test("missing realtime configuration does not crash a page or saved-message broadcast", async () => {
  for (const key of ["PUSHER_APP_ID", "PUSHER_SECRET", "NEXT_PUBLIC_PUSHER_KEY", "NEXT_PUBLIC_PUSHER_CLUSTER"]) delete process.env[key];
  assert.equal(getPusherClient(), null);
  await assert.doesNotReject(() => pusherServer.trigger("test", "message", {}));
});

test("polling never overlaps and prevents updates after unmount", async () => {
  let concurrent = 0, peak = 0, updates = 0;
  const stop = startMessagePolling(async (active) => {
    peak = Math.max(peak, ++concurrent);
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (active()) updates++;
    concurrent--;
  }, 2);
  await new Promise((resolve) => setTimeout(resolve, 30));
  stop();
  const before = updates;
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(updates, before);
  assert.equal(peak, 1);
  assert.ok(updates > 0);
});
