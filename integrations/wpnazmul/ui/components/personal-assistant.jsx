'use client';

import { useEffect, useRef, useState } from 'react';
import { workspace } from '../lib/workspace-client';
import { Icon } from './elements';

const endpoint = '/personal-assistant';
const sections = { message: 'Private chat', note: 'Notes', reminder: 'Reminders', email: 'Email drafts' };
const api = (path, method, body) => workspace('admin', endpoint + path, method, body);
const dateLabel = timestamp => new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka',
}).format(timestamp * 1000);

export function MyPaLauncher() {
  const recognition = useRef(null);
  const utterance = useRef(null);
  const sequence = useRef(0);
  const [phase, setPhase] = useState('idle');
  const [notice, setNotice] = useState('');

  function stop() {
    sequence.current++;
    recognition.current?.abort();
    recognition.current = null;
    if (utterance.current) window.speechSynthesis?.cancel();
    utterance.current = null;
    setPhase('idle');
  }

  useEffect(() => () => {
    sequence.current++;
    recognition.current?.abort();
    if (utterance.current) window.speechSynthesis?.cancel();
  }, []);

  async function start() {
    if (phase !== 'idle') { stop(); return; }
    setNotice('');
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech || !window.speechSynthesis) {
      setNotice('Voice is unavailable in this browser. Try Chrome or Edge, or use Inbox → My PA.');
      return;
    }
    const turn = ++sequence.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice('Microphone access is unavailable here. Open wpnazmul.com directly in Chrome or Edge.');
      return;
    }
    setPhase('permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      stream.getTracks().forEach(track=>track.stop());
    } catch(error) {
      if(turn!==sequence.current)return;
      setPhase('idle');
      setNotice(error.name==='NotFoundError'?'No microphone was found.':error.name==='NotReadableError'?'The microphone is busy or unavailable.':'Microphone access is blocked. Open the site settings next to the address bar, set Microphone to Allow, then click again.');
      return;
    }
    if(turn!==sequence.current)return;
    const mic = new Speech();
    recognition.current = mic;
    mic.lang = navigator.languages?.find(language => /^bn(?:-|$)/i.test(language)) || 'en-US';
    mic.interimResults = false;
    mic.continuous = false;
    let received = false;
    mic.onresult = async event => {
      if (turn !== sequence.current || received) return;
      const body = event.results[event.resultIndex]?.[0]?.transcript?.trim().slice(0,4000);
      if (!body) return;
      received = true;
      setPhase('thinking');
      try {
        const data = await api('', 'POST', {kind:'message',body});
        if (turn !== sequence.current) return;
        const reply = data.messages?.findLast(item=>item.kind==='reply');
        if (!reply?.body) throw new Error('My PA did not return a reply.');
        const voice = new SpeechSynthesisUtterance(reply.body);
        voice.lang = /[\u0980-\u09ff]/u.test(reply.body) ? 'bn-BD' : 'en-US';
        utterance.current = voice;
        const finish = () => {
          if (turn !== sequence.current) return;
          utterance.current = null;
          setPhase('idle');
        };
        voice.onend = finish;
        voice.onerror = () => { if(turn===sequence.current)setNotice('Audio playback failed. The reply is in Inbox → My PA.');finish(); };
        setPhase('speaking');
        window.speechSynthesis.speak(voice);
      } catch (problem) {
        if (turn !== sequence.current) return;
        setNotice(problem.message);
        setPhase('idle');
      }
    };
    mic.onerror = event => {
      if (turn !== sequence.current || received) return;
      setNotice(event.error==='not-allowed'?'Allow microphone access to talk to My PA.':'Could not hear you. Tap the icon and try again.');
      setPhase('idle');
    };
    mic.onend = () => {
      if (recognition.current===mic) recognition.current=null;
      if (turn===sequence.current && !received) setPhase('idle');
    };
    try { mic.start();setPhase('listening'); }
    catch { recognition.current=null;setPhase('idle');setNotice('Could not start speech recognition. Try Chrome or Edge.'); }
  }

  const label = ({idle:'Talk to My PA',permission:'Waiting for microphone permission',listening:'Listening. Click to stop.',thinking:'My PA is preparing a reply. Click to stop.',speaking:'My PA is speaking. Click to stop.'})[phase];
  return <>
    <button type="button" className={'my-pa-launcher my-pa-voice'+(phase==='idle'?'':' is-active')} aria-label={label} title={label}
      aria-pressed={phase!=='idle'} onClick={start}><span className="my-pa-orb" aria-hidden="true"><span/><span/><span className="my-pa-orb-glyph">✧</span></span></button>
    {notice&&<button type="button" className="my-pa-voice-notice" onClick={()=>setNotice('')} aria-label={notice+' Dismiss.'}>{notice}</button>}
  </>;
}

export function PersonalAssistant({ onResponding = () => {}, conversationOnly = false }) {
  const [section, select] = useState('message');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  useEffect(() => {
    let active = true;
    api('').then(result => {
      if (active) { setData(result); setNow(Date.now() / 1000); }
    }).catch(problem => { if (active) setError(problem.message); });
    const timer = window.setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  async function change(path, method, payload, form) {
    const responding = payload?.kind === 'message';
    setBusy(true);
    setError('');
    if (responding) onResponding(true);
    try { setData(await api(path, method, payload)); form?.reset(); }
    catch (problem) { setError(problem.message); }
    finally { if (responding) onResponding(false); setBusy(false); }
  }

  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = { kind: section, body: fields.get('body') };
    if (section === 'reminder') {
      payload.due_at = Date.parse(fields.get('due_at') + ':00+06:00') / 1000;
      payload.repeat_seconds = Number(fields.get('repeat_seconds'));
    }
    if (section === 'email') {
      payload.recipient = fields.get('recipient');
      payload.subject = fields.get('subject');
    }
    void change('', 'POST', payload, form);
  }

  const due = data?.items.filter(item => item.kind === 'reminder' && item.due_at && item.due_at <= now) ?? [];
  return <div className="stack">
    <p>Private workspace · Local assistant mode</p>
    {!conversationOnly && <nav className="admin-inbox-tabs" aria-label="Personal assistant tools">
      {Object.entries(sections).map(([key, label]) => <button type="button" className={'btn btn-sm ' + (section === key ? 'btn-dark' : 'btn-outline')} key={key} aria-pressed={section === key} onClick={() => select(key)}>{label}</button>)}
    </nav>}
    {error && <p role="alert" className="admin-error">{error}</p>}
    {!data && !error && <p role="status">Loading your workspace…</p>}
    {due.length > 0 && <div className="notice-box" role="status">{due.length} reminder{due.length === 1 ? '' : 's'} due. Open Reminders to mark them done.</div>}
    {data && <>
      {section === 'message' && <div role="log" aria-label="Private conversation" className="stack">
        {data.messages.map(item => <p className="text-pre" key={item.id}><strong>{item.kind === 'message' ? 'You' : 'Assistant'}: </strong>{item.body}</p>)}
      </div>}
      {section !== 'message' && <ul className="admin-simple-list">{data.items.filter(item => item.kind === section).map(item => <li key={item.id}>
        <p className="text-pre">{item.body}</p>
        {section === 'reminder' && <>
          <p>{item.due_at ? dateLabel(item.due_at) : 'Completed'}{item.due_at && item.due_at <= now ? ' · Due now' : ''}{item.repeat_seconds ? item.repeat_seconds === 3600 ? ' · Hourly' : ' · Daily' : ''}</p>
          {item.due_at && item.due_at <= now && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => change('/' + item.id + '/acknowledge', 'POST', {})}>Mark done</button>}
        </>}
        {section === 'email' && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => navigator.clipboard.writeText(item.body).catch(() => setError('Could not copy the draft.'))}>Copy draft</button>}
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => change('/' + item.id, 'DELETE')}>Delete</button>
      </li>)}</ul>}
      <form className="stack" key={section} onSubmit={submit}>
        {section === 'email' && <>
          <label className="field">Recipient<input name="recipient" maxLength={120} required/></label>
          <label className="field">Subject<input name="subject" maxLength={190} required/></label>
        </>}
        <label className="field">{section === 'message' ? 'Message' : section === 'note' ? 'Remember this' : section === 'reminder' ? 'Reminder or task' : 'What should the email say?'}
          <textarea name="body" maxLength={4000} rows={3} required/>
        </label>
        {section === 'reminder' && <>
          <label className="field">Due date and time (Dhaka)<input name="due_at" type="datetime-local" required/></label>
          <label className="field">Repeat<select name="repeat_seconds"><option value="0">Once</option><option value="3600">Hourly</option><option value="86400">Daily</option></select></label>
          <p className="small muted">Due reminders appear while this page is open.</p>
        </>}
        <button className="btn btn-dark btn-sm" disabled={busy}>{busy ? 'Saving…' : ({ message: 'Send message', note: 'Save note', reminder: 'Set reminder', email: 'Create draft' })[section]}</button>
      </form>
    </>}
  </div>;
}
