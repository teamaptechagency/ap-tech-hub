'use client';

import { useEffect, useRef, useState } from 'react';
import { workspace } from '../lib/workspace-client';

const api = (path = '', method, body, key) => workspace('admin', '/public-chat' + path, method, body, key);

export function PublicChatInbox() {
  const [threads, setThreads] = useState(null);
  const [selected, setSelected] = useState('');
  const [chat, setChat] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const delivery = useRef(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await api();
        if (active) setThreads(result.threads);
      } catch (problem) {
        if (active) setError(problem.message);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const refresh = async () => {
      try {
        const next = await api('/' + selected);
        if (active) setChat(current => current?.conversation_id === selected && (current.cursor ?? 0) > (next.cursor ?? 0) ? current : next);
      } catch (problem) {
        if (active) setError(problem.message);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [selected]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const body = new FormData(form).get('body').trim();
    if (!body) return;
    if (delivery.current?.selected !== selected || delivery.current?.body !== body) {
      delivery.current = { selected, body, key: crypto.randomUUID() };
    }
    setBusy(true);
    setError('');
    try {
      const result = await api('/' + selected, 'POST', { body }, delivery.current.key);
      setChat(current => (current?.cursor ?? 0) > (result.cursor ?? 0) ? current : ({ ...result, identity: current?.identity ?? result.identity }));
      delivery.current = null;
      form.reset();
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }

  return <div className="stack">
    {error && <p role="alert">{error}</p>}
    {!threads && !error && <p role="status">Loading conversations…</p>}
    {threads?.length === 0 && <p>No visitors are waiting for a reply.</p>}
    {threads?.length > 0 && <label className="field">Conversation
      <select disabled={busy} value={selected} onChange={event => { setChat(null); setError(''); setSelected(event.target.value); }}>
        <option value="">Choose a visitor</option>
        {threads.map(thread => <option key={thread.public_id} value={thread.public_id}>{thread.first_name} · {thread.status === 'waiting_human' ? 'Waiting' : 'Active'}</option>)}
      </select>
    </label>}
    {chat && <>
      <p>{chat.identity.email}{chat.identity.whatsapp && ' · ' + chat.identity.whatsapp}</p>
      <div className="stack" role="log" aria-label="Public conversation">
        {chat.messages.map(message => <p key={message.id} className="text-pre"><strong>{message.author_type === 'guest' ? chat.identity.first_name : message.ai_provider ? 'Assistant' : 'Workspace'}: </strong>{message.body}</p>)}
      </div>
      <form key={selected} className="stack" onSubmit={submit}>
        <label className="field">Reply<textarea name="body" required maxLength={4000} rows={3}/></label>
        <button className="btn btn-dark" disabled={busy}>{busy ? 'Sending…' : 'Send reply'}</button>
      </form>
    </>}
  </div>;
}

