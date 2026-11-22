'use client';

import { FileText, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useId, type FormEvent, type MouseEvent } from 'react';
import { workspace, WorkspaceError, recordId, type Realm } from '../lib/workspace-client';
import styles from './workspace-project-panels.module.css';

type Quote = {
  id: string; revision: number; status: 'issued' | 'superseded' | 'accepted' | 'revision_requested'; title: string;
  summary: string; amount_minor: number; currency: string; created_at: string; accepted_at: string | null; revision_reason?: string | null;
};
type ProjectFile = { id: string; name: string; mime_type: string; bytes: number; uploaded_by_role: Realm; created_at: string };
type Profile = { name: string; revision: number };
type ProjectPanel = { realm: Realm; path: string };

function usePanel<T>(realm: Realm, path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const inFlight = useRef(false);
  const intent = useRef<{ payload: object | string; key: string }>(null);
  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    const result = await workspace<T>(realm, path);
    if (active.current && !signal?.cancelled) setData(result);
  }, [realm, path]);

  useEffect(() => {
    active.current = true;
    const signal = { cancelled: false };
    load(signal).catch((error: Error) => {
      if (!signal.cancelled) setError(error.message);
    });
    return () => { active.current = false; signal.cancelled = true; };
  }, [load]);

  async function action(operation: () => Promise<string | void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const message = await operation();
      if (active.current && message) setNotice(message);
    } catch (error) {
      if (active.current) setError((error as Error).message);
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }

  async function post(endpoint: string, data: object, method = 'POST') {
    const payload = data instanceof FormData ? data.get('file')! : endpoint + JSON.stringify(data);
    if (intent.current?.payload !== payload) intent.current = { payload, key: crypto.randomUUID() };
    try {
      const result = await workspace<T>(realm, endpoint, method, data, intent.current.key);
      intent.current = null;
      return result;
    } catch (error) {
      if (error instanceof WorkspaceError && error.status < 500 && ![419, 429].includes(error.status)) intent.current = null;
      throw error;
    }
  }

  return { data, error, notice, busy, action, load, post, setData };
}

function Feedback({ error, notice }: { error: string; notice: string }) {
  return <>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </>;
}

const quoteAmount = (quote: Quote) => new Intl.NumberFormat('en', {
  style: 'currency', currency: quote.currency,
}).format(quote.amount_minor / 100);

export function ProjectQuotes({ realm, path }: ProjectPanel) {
  const endpoint = path + '/quotes';
  const panel = usePanel<{ quotes: Quote[] }>(realm, endpoint);
  const quotes = [...(panel.data?.quotes ?? [])].sort((a, b) => b.revision - a.revision);
  const current = quotes[0];

  function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const amount = String(fields.get('amount'));
    const [whole, decimal = ''] = amount.split('.');
    const amountMinor = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 1 || !/^\d+(?:\.\d{1,2})?$/.test(amount)) return;
    void panel.action(async () => {
      await panel.post(endpoint, {
        title: fields.get('title'), summary: fields.get('summary'), amount_minor: amountMinor,
        currency: fields.get('currency'), expected_revision: current?.revision ?? 0,
      });
      await panel.load();
      return 'Quote issued.';
    });
  }

  return <section className="panel" aria-label="Project quotes">
    <div className="panel-head"><h2>Quotes</h2><button className="btn btn-outline btn-sm" type="button" disabled={panel.busy} onClick={() => void panel.action(() => panel.load())}>Refresh quotes</button></div>
    <div className="panel-body"><Feedback error={panel.error} notice={panel.notice} />
    {panel.data ? quotes.length ? <ul className={styles.cards}>{quotes.map(quote =>
      <li key={quote.id}>
        <div className={styles.heading}><strong>{quote.title}</strong><span className={'pill '+(quote.status==='accepted'?'pill-green':'pill-gray')}>{quote.status.replaceAll('_', ' ')}</span></div>
        <p>{quoteAmount(quote)} · revision {quote.revision}</p>
        <p className={styles.copy}>{quote.summary}</p>{quote.revision_reason && <p className={styles.copy}><strong>Requested changes:</strong> {quote.revision_reason}</p>}
        {realm === 'client' && current?.id === quote.id && quote.status === 'issued' &&
          <><form className="stack client-panel-form" onSubmit={event => {
            event.preventDefault();
            void panel.action(async () => {
              await panel.post(endpoint + '/' + recordId(quote) + '/accept', { revision: quote.revision });
              await panel.load();
              return 'Quote accepted.';
            });
          }}>
            <label className={styles.check}><input type="checkbox" required /> I accept this quote for {quoteAmount(quote)}.</label>
            <button className="btn btn-dark btn-sm" disabled={panel.busy}>Accept quote</button>
          </form><details className="client-quote-changes">
            <summary>Request quote changes</summary>
            <form className="stack client-panel-form" onSubmit={event => {
              event.preventDefault();
              const reason = String(new FormData(event.currentTarget).get('reason')).trim();
              void panel.action(async () => {
                await panel.post(endpoint + '/' + recordId(quote) + '/request-revision', { revision: quote.revision, reason });
                await panel.load();
                return 'Quote changes requested.';
              });
            }}>
              <label className="field">What needs to change?<textarea name="reason" required maxLength={2000} /></label>
              <button className="btn btn-outline btn-sm" disabled={panel.busy}>Request changes</button>
            </form>
          </details></>}
      </li>)}</ul> : <p>No quotes have been issued.</p> : !panel.error && <p>Loading quotes…</p>}
    {realm === 'admin' && panel.data && current?.status !== 'accepted' && <form key={current?.id || 'new'} onSubmit={issue}>
      <h4>{current ? 'Issue a revised quote' : 'Issue a quote'}</h4>
      <label>Quote title<input name="title" defaultValue={current?.title} required maxLength={190} /></label>
      <label>Scope and terms<textarea name="summary" defaultValue={current?.summary} required maxLength={6000} /></label>
      <label>Quote amount<input name="amount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={current ? (current.amount_minor / 100).toFixed(2) : ''} required /></label>
      <label>Currency<select name="currency" defaultValue={current?.currency ?? 'USD'} required>
        {['USD', 'BDT', 'EUR', 'GBP'].map(currency => <option key={currency}>{currency}</option>)}
      </select></label>
      <button disabled={panel.busy}>Issue quote</button>
    </form>}</div>
  </section>;
}

export function ProjectFiles({ realm, path }: ProjectPanel) {
  const endpoint = path + '/files';
  const panel = usePanel<{ files: ProjectFile[] }>(realm, endpoint);
  const [file, setFile] = useState<File>();
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const form = event.currentTarget;
    const data = new FormData();
    data.append('file', file);
    void panel.action(async () => {
      await panel.post(endpoint, data);
      form.reset();
      setFile(undefined);
      await panel.load();
      return 'File uploaded.';
    });
  }

  return <section className="panel" aria-label="Private project files">
    <div className="panel-head"><h2>Shared files</h2><button className="btn btn-outline btn-sm" type="button" disabled={panel.busy} onClick={() => void panel.action(() => panel.load())}>Refresh files</button></div>
    <div className="panel-body"><Feedback error={panel.error} notice={panel.notice} />
    {panel.data ? panel.data.files.length ? <ul className="files-grid client-file-grid">{panel.data.files.map(item =>
      <li key={item.id} className="file-card">
        <span className="file-icon"><FileText aria-hidden="true" size={20} /></span>
        <div><strong>{item.name}</strong><p>{item.bytes.toLocaleString('en')} bytes · {item.uploaded_by_role}</p></div>
        <a className="btn btn-outline btn-sm" href={'/api/wp-admin/workspace' + endpoint + '/' + recordId(item) + '/download'} download
          aria-label={'Download ' + item.name}>Download</a>
      </li>)}</ul> : <p>No shared files for this project.</p> : !panel.error && <p>Loading files…</p>}
    {panel.data && <form className="stack client-panel-form" onSubmit={upload}>
      <label className="field">Choose a project file<input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" required disabled={panel.busy}
        onChange={event => setFile(event.target.files?.[0])} /></label>
      <p>PDF, PNG, JPEG, WebP or TXT up to 2 MiB.</p><button className="btn btn-dark btn-sm" disabled={panel.busy || !file || file.size > 2097152}>Upload file</button>{file && file.size > 2097152 && <p role="alert">Choose a file no larger than 2 MiB.</p>}
    </form>}</div>
  </section>;
}

export function ClientProfile({ email, onSaved }: { email: string; onSaved: (name: string) => void }) {
  const panel = usePanel<Profile>('client', '/profile');
  return <><header className="ws-title"><div><h1>Make yourself at home.</h1><p>Your profile and how to reach the project team.</p></div></header><div className="settings-layout">
    <section className="panel" aria-label="Client profile">
    <div className="panel-head"><h2>Your profile</h2></div><div className="panel-body">
    <div className={styles.profileIdentity}><UserRound aria-hidden="true" size={22} /><span>{panel.data?.name || 'Client account'}</span></div>
    <Feedback error={panel.error} notice={panel.notice} />
    <button className="btn btn-outline btn-sm" type="button" disabled={panel.busy} onClick={() => void panel.action(() => panel.load())}>Refresh profile</button>
    {panel.data ? <form className="stack client-panel-form" key={panel.data.revision} onSubmit={event => {
      event.preventDefault();
      const name = String(new FormData(event.currentTarget).get('name')).trim();
      const revision = panel.data!.revision;
      void panel.action(async () => {
        const updated = await panel.post('/profile', { name, revision }, 'PATCH');
        panel.setData(updated);
        onSaved(updated.name);
        return 'Profile saved.';
      });
    }}>
      <label className="field">Display name<input name="name" defaultValue={panel.data.name} maxLength={120} autoComplete="name" required /></label>
      <label className="field">Sign-in email<input value={email} readOnly /></label>
      <button className="btn btn-dark btn-sm" disabled={panel.busy}>Save profile</button>
    </form> : !panel.error && <p>Loading profile…</p>}
  </div></section><section className="panel"><div className="panel-head"><h2>Need a hand?</h2></div><div className="panel-body"><p>Open Messages in your workspace for project help.</p><Link className="btn btn-outline btn-sm" href="/client/messages">Message Nazmul</Link></div></section></div></>;
}

type DeliveryDecision = { id: string; decision: 'approved' | 'changes_requested'; reason?: string | null; created_at: string; result_status: string };
type DeliveryReviewData = { status: string; revision: number; can_decide: boolean; decisions: DeliveryDecision[]; has_more: boolean };

export function DeliveryReview({ realm, path, onDecision, projectStatus }: ProjectPanel & { projectStatus: string; onDecision: () => Promise<void> }) {
  const endpoint=path+'/delivery-review';
  const panel=usePanel<DeliveryReviewData>(realm,endpoint);
  const [mode,setMode]=useState<DeliveryDecision['decision']>();
  const dialog=useRef<HTMLDialogElement>(null);
  const opener=useRef<HTMLButtonElement>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  const titleId=useId();
  const formId=useId();
  const changing=mode==='changes_requested';

  function show(event: MouseEvent<HTMLButtonElement>, decision: DeliveryDecision['decision']) {
    opener.current=event.currentTarget;
    setMode(decision);
    dialog.current?.showModal();
  }

  function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const review=panel.data;
    if(!review?.can_decide||!mode)return;
    const reason=changing?String(new FormData(event.currentTarget).get('reason')).trim():undefined;
    void panel.action(async()=>{
      if(changing&&!reason)throw new Error('Describe the changes you need.');
      await panel.post(endpoint,{revision:review.revision,decision:mode,...(reason?{reason}:{})});
      await Promise.all([panel.load(),onDecision()]);
      dialog.current?.close();
      return changing?'Delivery changes requested.':'Delivery approved.';
    });
  }

  return <section className="panel" aria-label="Delivery review">
    <div className="panel-head"><h2 tabIndex={-1} ref={heading}>Delivery review</h2>
      <button className="btn btn-outline btn-sm" type="button" disabled={panel.busy} onClick={()=>void panel.action(()=>panel.load())}>Refresh delivery review</button></div>
    <div className="panel-body stack">
      {!mode&&<Feedback error={panel.error} notice={panel.notice}/>}
      {panel.data?<><div className="between"><p>Project status: {panel.data.status.replaceAll('_',' ')}</p>
        <span className={'pill '+(panel.data.can_decide?'pill-amber':'pill-gray')}>{panel.data.can_decide?'Review ready':'Review history'}</span></div>
        {panel.data.status!==projectStatus&&<button className="btn btn-outline btn-sm" type="button" disabled={panel.busy} onClick={()=>void panel.action(async()=>{
          await Promise.all([panel.load(),onDecision()]);
        })}>Refresh project and review</button>}
        {panel.data.can_decide&&<div className="client-panel-actions">
          <button className="btn btn-dark btn-sm" type="button" onClick={event=>show(event,'approved')}>Approve delivery</button>
          <button className="btn btn-outline btn-sm" type="button" onClick={event=>show(event,'changes_requested')}>Request delivery changes</button>
        </div>}
        {panel.data.decisions.length?<ul className={styles.cards}>{panel.data.decisions.map(decision=><li key={decision.id}>
          <strong>{decision.decision==='approved'?'Delivery approved':'Delivery changes requested'}</strong>
          <p className="tiny muted">{decision.created_at.slice(0,10)}</p>
          {decision.reason&&<p className={styles.copy}>{decision.reason}</p>}
        </li>)}</ul>:<p className="muted">No delivery decisions yet.</p>}
        {panel.data.has_more&&<p>Showing the 100 most recent decisions.</p>}
      </>:!panel.error&&<p role="status">Loading delivery review…</p>}
    </div>
    <dialog ref={dialog} className="preview-dialog small-modal client-decision" aria-labelledby={titleId}
      onCancel={event=>{if(panel.busy)event.preventDefault();}}
      onClose={()=>{setMode(undefined);if(opener.current?.isConnected)opener.current.focus();else heading.current?.focus();}}>
      <div className="modal-header"><h2 id={titleId}>{changing?'Let’s get the details right.':'Ready for the next chapter?'}</h2>
        <button className="icon-btn" type="button" aria-label="Close dialog" disabled={panel.busy} onClick={()=>dialog.current?.close()}>×</button></div>
      <div className="modal-body"><form className="stack" id={formId} onSubmit={decide} key={mode}>
        {changing?<><p>Share the changes you’d like to see in the next delivery.</p>
          <label className="field">Requested delivery changes<textarea name="reason" maxLength={2000} required placeholder="What works and what needs a change…"/></label></>:
          <><p>Approve this delivery after reviewing the work. Approval completes the project.</p>
          <label className={styles.check}><input type="checkbox" required/> I have reviewed this delivery and approve it.</label></>}
        {mode&&panel.error&&<p className="client-error" role="alert">{panel.error}</p>}
      </form></div>
      <div className="modal-footer"><button className="btn btn-outline btn-sm" type="button" disabled={panel.busy} onClick={()=>dialog.current?.close()}>{changing?'Cancel':'Keep reviewing'}</button>
        <button className="btn btn-dark btn-sm" type="submit" form={formId} disabled={panel.busy}>{changing?'Submit delivery changes':'Approve delivery'}</button></div>
    </dialog>
  </section>;
}
