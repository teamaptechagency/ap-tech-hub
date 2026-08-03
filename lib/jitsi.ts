import { SignJWT, importPKCS8 } from "jose";

/**
 * Video meetings.
 *
 * The free meet.jit.si requires whoever opens a room to sign in with a Google,
 * GitHub or Facebook account, and that sign-in cannot be completed from inside
 * an embedded iframe — so an embedded meeting there can never actually start.
 * Jitsi as a Service authorises each participant with a signed token instead,
 * which is the whole point of using it here: nobody sees a third-party login.
 *
 * With no JaaS credentials configured the app falls back to the old meet.jit.si
 * room so meetings keep working exactly as before, moderator prompt included.
 */

const JAAS_HOST = "https://8x8.vc";
const PUBLIC_HOST = "https://meet.jit.si";

/** Hours a meeting token stays valid. Long enough to outlast a long call. */
const TOKEN_HOURS = 4;

type JaasConfig = {
  appId: string;
  /** The API key id, which travels in the JWT header as `kid`. */
  apiKey: string;
  privateKey: string;
};

export function readJaasConfig(): JaasConfig | null {
  const appId = process.env.JAAS_APP_ID?.trim();
  const apiKey = process.env.JAAS_API_KEY?.trim();
  const privateKey = process.env.JAAS_PRIVATE_KEY?.trim();

  if (!appId || !apiKey || !privateKey) return null;

  return {
    appId,
    apiKey,
    // Environment panels store the PEM on one line with escaped newlines.
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

export function isJaasConfigured() {
  return readJaasConfig() !== null;
}

/** The room name, stable across both hosts. */
export function meetingRoomName(roomCode: string) {
  return `APTechHub-${roomCode}`;
}

/** The plain meet.jit.si room used when JaaS is not configured. */
export function publicMeetingUrl(roomCode: string) {
  return `${PUBLIC_HOST}/${meetingRoomName(roomCode)}`;
}

export type MeetingParticipantIdentity = {
  id: string;
  name: string | null;
  email?: string | null;
  /** Moderators can mute, kick and end the meeting for everyone. */
  moderator: boolean;
};

/**
 * The URL to embed for one participant.
 *
 * Returns the meet.jit.si room unchanged when JaaS is not configured, so the
 * feature degrades instead of breaking.
 */
export async function meetingEmbedUrl(
  roomCode: string,
  user: MeetingParticipantIdentity
): Promise<string> {
  const config = readJaasConfig();
  const room = meetingRoomName(roomCode);

  if (!config) {
    // Pass the name so Jitsi does not ask for one it has already been told.
    const name = encodeURIComponent(JSON.stringify(user.name ?? "Guest"));
    return `${publicMeetingUrl(roomCode)}#userInfo.displayName=${name}`;
  }

  const key = await importPKCS8(config.privateKey, "RS256");
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    aud: "jitsi",
    iss: "chat",
    sub: config.appId,
    room,
    context: {
      user: {
        id: user.id,
        name: user.name ?? "Guest",
        email: user.email ?? undefined,
        moderator: user.moderator ? "true" : "false",
      },
      features: {
        livestreaming: "false",
        recording: "false",
        transcription: "false",
        "outbound-call": "false",
      },
    },
  })
    .setProtectedHeader({ alg: "RS256", kid: config.apiKey, typ: "JWT" })
    .setIssuedAt(now)
    // A little slack so a clock a few seconds behind does not reject the token.
    .setNotBefore(now - 30)
    .setExpirationTime(now + TOKEN_HOURS * 60 * 60)
    .sign(key);

  return `${JAAS_HOST}/${config.appId}/${room}?jwt=${token}`;
}
