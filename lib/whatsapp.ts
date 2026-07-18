import { readFile } from "node:fs/promises";
import path from "node:path";

type WhatsAppConfig = {
  enabled: boolean;
  otpEnabled: boolean;
  notificationsEnabled: boolean;
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
};

const envKeys = [
  "WHATSAPP_ENABLED",
  "WHATSAPP_OTP_ENABLED",
  "WHATSAPP_NOTIFICATIONS_ENABLED",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_GRAPH_VERSION",
] as const;

type EnvKey = (typeof envKeys)[number];

function truthy(value: string) {
  return ["1", "true", "yes", "on", "enabled"].includes(
    value.trim().toLowerCase()
  );
}

function normalizeEnvValue(key: EnvKey, value: string | undefined | null) {
  let cleanValue = value?.trim() ?? "";

  if (cleanValue.startsWith(`${key}=`)) {
    cleanValue = cleanValue.slice(key.length + 1).trim();
  }

  if (
    (cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
    (cleanValue.startsWith("'") && cleanValue.endsWith("'"))
  ) {
    cleanValue = cleanValue.slice(1, -1).trim();
  }

  return cleanValue;
}

async function readEnvFileValue(key: EnvKey) {
  try {
    const content = await readFile(path.join(process.cwd(), ".env"), "utf8");
    const matches = Array.from(
      content.matchAll(new RegExp(`^${key}=(.*)$`, "gm"))
    );

    return normalizeEnvValue(key, matches.at(-1)?.[1]);
  } catch {
    return "";
  }
}

async function readWhatsAppConfig(): Promise<WhatsAppConfig> {
  const values = Object.fromEntries(
    await Promise.all(
      envKeys.map(async (key) => [
        key,
        (await readEnvFileValue(key)) || normalizeEnvValue(key, process.env[key]),
      ])
    )
  ) as Record<EnvKey, string>;

  return {
    enabled: truthy(values.WHATSAPP_ENABLED),
    otpEnabled: truthy(values.WHATSAPP_OTP_ENABLED),
    notificationsEnabled: truthy(values.WHATSAPP_NOTIFICATIONS_ENABLED),
    accessToken: values.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: values.WHATSAPP_PHONE_NUMBER_ID,
    graphVersion: values.WHATSAPP_GRAPH_VERSION || "v20.0",
  };
}

export function normalizeWhatsAppPhone(phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return "";

  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

async function sendWhatsAppText(phone: string, body: string) {
  const config = await readWhatsAppConfig();
  const to = normalizeWhatsAppPhone(phone);

  if (!config.enabled || !to || !config.accessToken || !config.phoneNumberId) {
    return { skipped: true };
  }

  const response = await fetch(
    `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`WhatsApp send failed: ${response.status} ${errorBody}`);
  }

  return { success: true };
}

export async function sendWhatsAppOtp(phone: string | undefined, code: string) {
  const config = await readWhatsAppConfig();
  if (!config.otpEnabled) return { skipped: true };

  return sendWhatsAppText(
    phone ?? "",
    `Your AP Tech Hub verification code is ${code}. It expires in 10 minutes.`
  );
}

export async function sendWhatsAppNotification(input: {
  phone?: string | null;
  title: string;
  body?: string | null;
  href?: string | null;
}) {
  const config = await readWhatsAppConfig();
  if (!config.notificationsEnabled) return { skipped: true };

  const lines = [
    `AP Tech Hub: ${input.title}`,
    input.body,
    input.href ? `Open: ${input.href}` : "",
  ].filter(Boolean);

  return sendWhatsAppText(input.phone ?? "", lines.join("\n"));
}
