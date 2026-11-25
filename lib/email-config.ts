import { emailDeliveryConfigured } from "./app-mailer";

// System mail must use its dedicated account, never a client mailbox fallback.
export async function getEmailConfig() {
 return {configured:await emailDeliveryConfigured("noreply"),resendApiKey:undefined,emailFrom:"AP Tech Hub <no-reply@aptechagency.com>"};
}
export function getEmailErrorMessage(error: unknown) {
 const message=error instanceof Error?error.message:typeof error==="string"?error:"";
 return message||"Email could not be sent. Check Integration & Config → Mail accounts → No-reply / System Mail.";
}
