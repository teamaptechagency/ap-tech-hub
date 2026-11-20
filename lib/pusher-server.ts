import Pusher from "pusher";

let client: Pusher | null = null;
export const pusherServer = {
  async trigger(channel: string | string[], event: string, data: unknown) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!appId || !key || !secret || !cluster) return;
    client ??= new Pusher({ appId, key, secret, cluster, useTLS: true });
    return client.trigger(channel, event, data);
  },
};
