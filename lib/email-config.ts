import { readFile } from "node:fs/promises";
import path from "node:path";

const emailKeys = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

type EmailKey = (typeof emailKeys)[number];

function normalizeEnvValue(key: EmailKey, value: string | undefined | null) {
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

async function readEnvFileValue(key: EmailKey) {
  try {
    const content = await readFile(path.join(process.cwd(), ".env"), "utf8");
    const matches = Array.from(
      content.matchAll(new RegExp(`^${key}=(.*)$`, "gm"))
    );
    const rawValue = matches.at(-1)?.[1];

    return normalizeEnvValue(key, rawValue);
  } catch {
    return "";
  }
}

export async function getEmailConfig() {
  const [resendApiKeyFromFile, emailFromFromFile] = await Promise.all([
    readEnvFileValue("RESEND_API_KEY"),
    readEnvFileValue("EMAIL_FROM"),
  ]);

  return {
    resendApiKey:
      resendApiKeyFromFile ||
      normalizeEnvValue("RESEND_API_KEY", process.env.RESEND_API_KEY),
    emailFrom:
      emailFromFromFile ||
      normalizeEnvValue("EMAIL_FROM", process.env.EMAIL_FROM) ||
      "AP Tech Hub <onboarding@resend.dev>",
  };
}

export function getEmailErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("domain") || lowerMessage.includes("verify")) {
    return "Email sender domain is not verified in Resend. Verify the EMAIL_FROM domain or use a verified sender address.";
  }

  if (
    lowerMessage.includes("api key") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("forbidden")
  ) {
    return "RESEND_API_KEY is invalid or missing. Update it in Settings > Environment.";
  }

  return message || "Email could not be sent. Check RESEND_API_KEY and EMAIL_FROM.";
}
