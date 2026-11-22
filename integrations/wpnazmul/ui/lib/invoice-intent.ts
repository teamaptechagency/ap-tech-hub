export type InvoicePayload = { title: string; amount_minor: number; currency: string };
export type InvoiceIntent = { key: string; payload: InvoicePayload };

const prefix = 'workspace:invoice-intent:v1:';
const actorPrefix = (actor: string | number) => prefix + encodeURIComponent(actor) + ':';
const storageKey = (actor: string | number, project: string) => actorPrefix(actor) + project;

export function clearInvoiceIntentsExcept(actor?: string | number) {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix) && (actor === undefined || !key.startsWith(actorPrefix(actor)))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Browser policy may disable session storage. Issuance requires a successful write before sending.
  }
}

export function pendingInvoice(actor: string | number, project: string): InvoiceIntent | null {
  const value = sessionStorage.getItem(storageKey(actor, project));
  if (!value) return null;
  const intent = JSON.parse(value) as InvoiceIntent;
  if (!/^[\da-f-]{36}$/i.test(intent.key) || typeof intent.payload?.title !== 'string' ||
      !Number.isSafeInteger(intent.payload.amount_minor) || intent.payload.amount_minor <= 0 ||
      !['BDT', 'USD', 'EUR', 'GBP'].includes(intent.payload.currency)) {
    throw new Error('The pending invoice record cannot be read. Reconcile this invoice before starting a new one.');
  }
  return intent;
}

export function acquireInvoiceIntent(actor: string | number, project: string, payload: InvoicePayload) {
  const pending = pendingInvoice(actor, project);
  if (pending) {
    const original = pending.payload;
    if (original.title !== payload.title || original.amount_minor !== payload.amount_minor || original.currency !== payload.currency) {
      throw new Error('Resolve the pending invoice before issuing a milestone with different details.');
    }
    return pending;
  }
  const intent = { key: crypto.randomUUID(), payload };
  sessionStorage.setItem(storageKey(actor, project), JSON.stringify(intent));
  return intent;
}

export function resolveInvoiceIntent(actor: string | number, project: string, key: string) {
  if (pendingInvoice(actor, project)?.key === key) sessionStorage.removeItem(storageKey(actor, project));
}
