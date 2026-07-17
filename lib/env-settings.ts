export const editableEnvKeys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "PUSHER_APP_ID",
  "PUSHER_SECRET",
  "NEXT_PUBLIC_PUSHER_KEY",
  "NEXT_PUBLIC_PUSHER_CLUSTER",
  "CRON_SECRET",
] as const;

export type EditableEnvKey = (typeof editableEnvKeys)[number];
