'use client';

import { useEffect, useRef, useState } from 'react';
import { acquireInvoiceIntent, pendingInvoice, resolveInvoiceIntent, type InvoiceIntent, type InvoicePayload } from '../lib/invoice-intent';
import { workspace, WorkspaceError, type Invoice, type Person } from '../lib/workspace-client';

export function InvoiceIssuance({ actor, project, endpoint, disabled, onIssued }: {
  actor: Person['id']; project: string; endpoint: string; disabled: boolean;
  onIssued: (invoice: Invoice) => Promise<void>;
}) {
  const [pending, setPending] = useState<InvoiceIntent | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<Invoice>();
  const running = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    try { setPending(pendingInvoice(actor, project)); setReady(true); }
    catch { setError('Invoice recovery storage is unavailable or unreadable. Reconcile any pending invoice before issuing another.'); }
  }, [actor, project]);

  async function issue(payload: InvoicePayload) {
    if (running.current || disabled || !ready) return;
    running.current = true;
    setBusy(true);
    setError('');
    setIssued(undefined);
    try {
      const { user } = await workspace<{ user: Person | null }>('admin', '/session');
      if (user?.id !== actor) throw new Error('The administrator session changed. Sign in again and reopen this project.');
      const intent = acquireInvoiceIntent(actor, project, payload);
      setPending(intent);
      let invoice: Invoice;
      try {
        invoice = await workspace<Invoice>('admin', endpoint, 'POST', intent.payload, intent.key);
        if (typeof invoice.id !== 'string' || !invoice.id) throw new Error('The invoice acknowledgement was incomplete. Retry the pending invoice.');
      } catch (failure) {
        if (failure instanceof WorkspaceError && failure.status === 422) {
          resolveInvoiceIntent(actor, project, intent.key);
          setPending(null);
        }
        throw failure;
      }
      resolveInvoiceIntent(actor, project, intent.key);
      setPending(null);
      setIssued(invoice);
      formRef.current?.reset();
      try { await onIssued(invoice); }
      catch { setError('The invoice was issued. Refresh the project to update the list.'); }
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return <>
    {error && <p role="alert">{error}</p>}
    {issued && <p role="status">Invoice issued: {issued.title} ({issued.id}).</p>}
    {pending ? <div>
      <p>Pending invoice: {pending.payload.title} · {pending.payload.currency} {(pending.payload.amount_minor / 100).toFixed(2)}</p>
      <p>Retry the saved request to retrieve its result before issuing another milestone.</p>
      <button type="button" disabled={busy || disabled} onClick={() => void issue(pending.payload)}>Retry pending invoice</button>
    </div> : <form ref={formRef} onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(fields.get('amount')).trim());
      const amount = match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0')) : 0;
      const title = String(fields.get('title')).trim();
      if (!title || !Number.isSafeInteger(amount) || amount < 1 || amount > 999999999999) {
        setError('Enter a milestone title and a valid positive amount with up to two decimal places.');
        return;
      }
      void issue({title, amount_minor: amount, currency: String(fields.get('currency'))});
    }}>
      <label>Milestone title<input name="title" maxLength={190} required /></label>
      <label>Amount<input name="amount" inputMode="decimal" required /></label>
      <label>Currency<select name="currency">{['BDT','USD','EUR','GBP'].map(currency => <option key={currency}>{currency}</option>)}</select></label>
      <button disabled={!ready || busy || disabled}>Issue invoice</button>
    </form>}
  </>;
}
