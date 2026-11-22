'use client';
import { hubFetch } from '../lib/hub-fetch';



import { useEffect, useRef, useState } from 'react';
import { Icon } from './elements';
import { CalendarDays, Code2, Globe2, MessageCircle, Mic, ShoppingBag, Zap } from 'lucide-react';

const tabOptions = [
  ['live', 'Live chat', MessageCircle],
  ['voice', 'Voice chat', Mic],
];

const topicIcons = [Globe2, Zap, ShoppingBag, Code2];
const prompts = [
  ['New website', 'WordPress', 'Business website', 'Portfolio', 'Landing page'],
  ['Website improvements', 'Performance', 'Slow pages', 'Mobile usability', 'Website errors'],
  ['Online store', 'Ecommerce', 'New store', 'Checkout improvements', 'Product catalogue'],
  ['Custom development', 'Web applications', 'Client portal', 'Internal dashboard', 'API integration'],
];

async function request(path, { token, body, key } = {}) {
  const response = await hubFetch('/api' + path, {
    credentials: 'same-origin', cache: 'no-store',
    ...(body ? { method: 'POST', body, headers: {
      'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, 'Idempotency-Key': key,
      Accept: 'application/json',
    } } : { headers: { Accept: 'application/json' } }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error?.message || data?.message || 'The assistant is unavailable. Please try again.');
  return data;
}

export function VoiceAssistant({ externalButton }) {
  const dialog = useRef(null), opener = useRef(null), recognition = useRef(null), speech = useRef(null);
  const csrf = useRef(null), intent = useRef(null), working = useRef(false), opened = useRef(false);
  const [chat, setChat] = useState(null), [draft, setDraft] = useState('');
  const [mode, setMode] = useState('live');
  const [topic, setTopic] = useState(null), [subcategory, setSubcategory] = useState(false);
  const [busy, setBusy] = useState(false), [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false), [readReplies, setReadReplies] = useState(false);
  const [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [verified, setVerified] = useState(false), [codeSent, setCodeSent] = useState(false);
  const [upgrade, setUpgrade] = useState(false), [prior, setPrior] = useState(null);
  const [restoreOnly, setRestoreOnly] = useState(false);
  const [guestClock, setGuestClock] = useState(0);
  const [booking, setBooking] = useState(false), [slots, setSlots] = useState(null);
  const [booked, setBooked] = useState(null);
  const call = useRef(null);
  const [clock, setClock] = useState({ active: 0, wait: 0 });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = call.current;
      if (!current) return;
      const now = performance.now();
      const active = current.id ? Math.max(0, Math.ceil((current.end - now) / 1000)) : 0;
      const wait = Math.max(0, Math.ceil((current.retry - now) / 1000));
      setClock(previous => previous.active === active && previous.wait === wait ? previous : { active, wait });
      if (current.id && !active) {
        current.id = null;
        stopAudio();
        setMode('voice');
        setNotice('Voice session ended. Your transcript stays here. Keep typing during the five-minute break.');
      }
      if (!wait) call.current = null;
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    const mic = recognition.current;
    recognition.current = null;
    mic?.abort();
    if (speech.current) window.speechSynthesis?.cancel();
  }, []);

  function stopSpeaking() {
    if (speech.current) window.speechSynthesis?.cancel();
    speech.current = null;
    setSpeaking(false);
  }

  function stopAudio() {
    const mic = recognition.current;
    recognition.current = null;
    mic?.abort();
    setListening(false);
    stopSpeaking();
  }

  function activeCall() {
    const current = call.current;
    return current && performance.now() < current.end ? current.id : null;
  }

  function listen() {
    if (!activeCall()) return;
    if (recognition.current) { recognition.current.stop(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setNotice('Voice input is unavailable in this browser. You can type your message.'); return; }
    stopSpeaking();
    const mic = new Recognition();
    recognition.current = mic;
    mic.lang = language;
    mic.onresult = event => {
      if (recognition.current !== mic || !activeCall()) return;
      const words = event.results[0]?.[0]?.transcript?.trim();
      if (words) setDraft(value => [value.trim(), words].filter(Boolean).join(' ').slice(0,4000));
      setNotice('Review your transcript, then send it when ready.');
    };
    mic.onerror = () => { if (recognition.current === mic) setNotice('Voice input stopped or was denied. Try again or type your message.'); };
    mic.onend = () => { if (recognition.current === mic) { recognition.current = null; setListening(false); } };
    try { mic.start(); setListening(true); setNotice('Listening…'); }
    catch { recognition.current = null; setListening(false); setNotice('Could not start the microphone. You can type your message.'); }
  }

  function speak(text) {
    if (!activeCall() || !opened.current || !text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0980-\u09ff]/u.test(text) ? 'bn-BD' : 'en-US';
    speech.current = utterance;
    utterance.onend = utterance.onerror = () => { if (speech.current === utterance) { speech.current = null; setSpeaking(false); } };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  async function run(path, payload, onSuccess) {
    if (working.current) return;
    working.current = true;
    setBusy(true); setError('');
    const body = JSON.stringify(payload);
    if (intent.current?.path !== path || intent.current?.body !== body) intent.current = { path, body, key: crypto.randomUUID() };
    try {
      csrf.current ||= (await request('/session')).csrf;
      const next = await request(path, { token: csrf.current, body, key: intent.current.key });
      intent.current = null;
      if (next.conversation_id) setChat(next);
      onSuccess?.(next);
    } catch (err) { setError(err.message); csrf.current = null; }
    finally { working.current = false; setBusy(false); }
  }

  function voice(action, payload, onSuccess) {
    return run('/public-chat/conversations/' + chat.conversation_id + '/voice/' + action, payload, onSuccess);
  }

  function syncClock(data) {
    const now = performance.now();
    const remaining = Math.max(0, data.call_until - data.server_now);
    const wait = Math.max(0, data.retry_at - data.server_now);
    call.current = { id: data.call_id, end: now + remaining * 1000, retry: now + wait * 1000 };
    setClock({ active: data.call_id ? remaining : 0, wait });
    if (!data.call_id) stopAudio();
  }

  useEffect(() => {
    if (!chat?.identity?.guest_until) return;
    const tick = () => setGuestClock(Math.max(0, chat.identity.guest_until - Math.floor(Date.now() / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [chat?.identity?.guest_until]);

  async function restoreHistory(before) {
    try {
      const result = await request('/public-chat/conversations/' + chat.conversation_id + '/prior' + (before ? '?before=' + before : ''));
      setPrior(current => ({ ...result, messages: before ? [...result.messages, ...(current?.messages ?? [])] : result.messages }));
    } catch (err) { setError(err.message); }
  }

  function start(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run('/public-chat/start', { first_name: form.get('name'), email: form.get('email'), consent: form.has('consent'), whatsapp: form.get('whatsapp') || null, ai_provider: 'openai' }, () => setUpgrade(false));
  }

  async function loadSlots() {
    setSlots(null);
    setError('');
    try { setSlots((await request('/public-chat/conversations/' + chat.conversation_id + '/appointments')).slots); }
    catch (err) { setSlots([]); setError(err.message); }
  }

  useEffect(() => {
    if (!chat?.conversation_id || mode !== 'live') return;
    let active = true;
    const timer = window.setInterval(async () => {
      if (!opened.current || working.current) return;
      try {
        const next = await request('/public-chat/conversations/' + chat.conversation_id + '/messages');
        if (active && !working.current) setChat(current => (next.cursor ?? 0) >= (current.cursor ?? 0) ? next : current);
      } catch { /* Keep the last transcript until the connection recovers. */ }
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [chat?.conversation_id, mode]);

  function send(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || listening) return;
    const previous = new Set(chat.messages.map(message => message.id));
    const callId = mode === 'voice' ? activeCall() : null;
    void run('/public-chat/conversations/' + chat.conversation_id + '/messages', { body, ai_provider: 'openai', ...(mode === 'live' ? { request_human: true } : verified ? { voice_text: true } : {}), ...(callId ? { voice_call_id: callId } : {}) }, next => {
      setDraft('');
      const reply = next.messages.findLast(message => message.ai_provider && !previous.has(message.id));
      if (next.state !== 'ai_active') stopAudio();
      else if (readReplies && callId && activeCall() === callId) speak(reply?.body);
    });
  }

  const inviteHandled = useRef(false);
  useEffect(() => {
    const prefix = '#lead-chat=';
    if (!window.location.hash.startsWith(prefix) || inviteHandled.current) return;
    inviteHandled.current = true;
    const token = window.location.hash.slice(prefix.length);
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    opened.current = true;
    dialog.current?.showModal();
    void run('/public-chat/lead-invitation', { token });
  }, []);

  function open(event) {
    opener.current = event.currentTarget;
    opened.current = true;
    dialog.current?.showModal();
    if (!chat && !working.current) {
      working.current = true;
      setBusy(true);
      request('/public-chat/resume').then(next => { if (next.conversation_id) setChat(next); })
        .catch(err => setError(err.message)).finally(() => { working.current = false; setBusy(false); });
    }
  }

  function close() {
    opened.current = false;
    const mic = recognition.current;
    recognition.current = null;
    mic?.abort(); setListening(false); stopSpeaking(); setNotice('');
    opener.current?.focus();
  }

  const canHandoff = chat && !['waiting_human','handoff_requested','human_active','resolved'].includes(chat.state);
  return <>
    {externalButton && <button type="button" className="btn btn-green" onClick={open}>Find your starting point <Icon name="spark" /></button>}
    <button type="button" className="assistant-launch" aria-label="Ask my assistant" onClick={open}><span><Icon name="spark" /></span><span>Ask my assistant</span></button>
    <dialog ref={dialog} className="chat-widget preview-assistant" aria-label="Nazmul’s assistant" onClose={close}>
      <header className="widget-header"><span className="widget-symbol"><Icon name="spark"/></span>
        <div><strong>Nazmul’s assistant</strong><p>Live chat and voice</p></div>
        <button type="button" className="icon-btn" aria-label="Close assistant" onClick={() => dialog.current?.close()}><Icon name="close"/></button>
      </header>
      {chat && !chat.identity.guest && !upgrade && <nav className="widget-tabs" aria-label="Conversation options">
        {tabOptions.map(([key, label, TabIcon]) => <button type="button" key={key} className={mode === key ? 'active' : ''} aria-pressed={mode === key} onClick={() => { setMode(key); setDraft(''); setTopic(null); setSubcategory(false); setBooking(false); setBooked(null); if (key !== 'voice') stopAudio(); }}><TabIcon size={15} aria-hidden="true"/> {label}</button>)}
      </nav>}
      <div className="widget-body">
        {(!chat || upgrade) ? <form className="widget-welcome voice-gate" onSubmit={start}>
          <h3>Let’s start with hello.</h3>
          <label>Name <input name="name" required maxLength={80} autoComplete="name"/></label>
          <label>Email <input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
          <label>WhatsApp number (optional) <input name="whatsapp" type="tel" maxLength={16} pattern="[+][1-9][0-9]{6,14}" placeholder="+880…"/></label>
          <label><input name="consent" type="checkbox" required/> I agree to use my details for this public chat.</label>
          <button className="btn btn-dark" disabled={busy}>{busy ? 'Loading…' : 'Start chat'}</button>
          {!chat && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => { setGuestClock(900); void run('/public-chat/start', { guest: true }); }}>Continue as guest · 15 minutes</button>}
          {upgrade && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setUpgrade(false)}>Back to guest chat</button>}
        </form> : mode === 'live' && booking && chat ? <div className="widget-welcome">
          <h3>Book an appointment</h3>
          {booked ? <p role="status">Appointment booked for {slotLabel(booked)}.</p> : <>
            <p>30-minute appointments · Dhaka time</p>
            {slots === null ? <p role="status">Loading available times…</p> : slots.length ? <form className="voice-gate" onSubmit={event => {
              event.preventDefault();
              const time = Number(new FormData(event.currentTarget).get('slot'));
              void run('/public-chat/conversations/' + chat.conversation_id + '/appointments', { starts_at: time }, result => setBooked(result.starts_at));
            }}>
              <label>Available times <select name="slot" disabled={busy} required><option value="">Choose a time</option>{slots.map(slot => <option key={slot} value={slot}>{slotLabel(slot)}</option>)}</select></label>
              <button className="btn btn-dark btn-sm" disabled={busy}>Book appointment</button>
            </form> : <p>No times are available right now.</p>}
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={loadSlots}>Refresh times</button>
          </>}
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setBooking(false)}>Back to live chat</button>
        </div> : mode === 'live' && chat && !chat.messages.some(message => message.author_type === 'guest') ? <div className="widget-welcome">
          <p>{topic ? topic[0] : 'Hi! What would you like help with?'}</p>
          <div className="widget-prompts">
            {!topic && <button type="button" onClick={() => { setBooking(true); setBooked(null); void loadSlots(); }}><CalendarDays size={17} aria-hidden="true"/> Book an appointment</button>}
            {!topic ? prompts.map((item, index) => { const TopicIcon = topicIcons[index]; return <button type="button" key={item[0]} onClick={() => setTopic(item)}><TopicIcon size={17} aria-hidden="true"/> {item[0]}</button>; })
            : !subcategory ? <button type="button" onClick={() => setSubcategory(true)}>{topic[1]}</button>
            : topic.slice(2).map(item => <button type="button" key={item} onClick={() => { setDraft(topic.slice(0, 2).concat(item).join(' / ')); setTopic(null); setSubcategory(false); dialog.current?.querySelector('[aria-label="Message or transcript"]')?.focus(); }}>{item}</button>)}
            {topic && <button type="button" onClick={() => subcategory ? setSubcategory(false) : setTopic(null)}>Back</button>}
          </div>
        </div> : <>
          <div role="log" aria-label="Chat messages">
            {chat.messages.map(message => <p key={message.id}><strong>{message.author_type === 'guest' ? 'You' : message.ai_provider ? 'AI assistant' : 'Workspace update'}: </strong>{message.body}
            {message.ai_provider && chat.state === 'ai_active' && clock.active > 0 && <button type="button" className="btn btn-sm" onClick={() => speak(message.body)}>Listen</button>}</p>)}
          </div>
          {canHandoff && mode === 'live' && <button type="button" className="btn btn-dark btn-sm" disabled={busy} onClick={() => run('/public-chat/conversations/' + chat.conversation_id + '/handoff', {})}>Request human conversation</button>}
          {['waiting_human','handoff_requested'].includes(chat.state) && <p>Your request is in the inbox.</p>}
        </>}
        {chat?.identity.guest && !upgrade && <p>Guest text chat · {formatTime(guestClock)} left. <button type="button" className="btn btn-outline btn-sm" onClick={() => setUpgrade(true)}>Add details to keep chatting or use voice</button></p>}
        {chat && !chat.identity.guest && mode === 'live' && !upgrade && <button type="button" className="btn btn-outline btn-sm" onClick={() => {
          if (verified) void restoreHistory();
          else { setRestoreOnly(true); setMode('voice'); }
        }}>Restore earlier chats</button>}
        {prior && <section><h3>Earlier conversations</h3>{prior.messages.length ? <div role="log">{prior.messages.map(message => <p key={message.id}><strong>{message.author_type === 'guest' ? 'You' : 'Workspace'}: </strong>{message.body}</p>)}</div> : <p>No earlier messages found.</p>}
          {prior.before && <button type="button" className="btn btn-outline btn-sm" onClick={() => void restoreHistory(prior.before)}>Load earlier messages</button>}
        </section>}
        {error && <p role="alert">{error}</p>}
      </div>
      {chat && !upgrade && (!chat.identity.guest || guestClock > 0) && (chat.state !== 'resolved' || restoreOnly) && !(mode === 'live' && booking) && <>
        {mode === 'voice' && (chat.state === 'ai_active' || restoreOnly) && <div className="voice-controls">
          {!verified ? <>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => voice('challenge', {}, () => { setCodeSent(true); setNotice('Check your email for the verification code.'); })}>{codeSent ? 'Resend code' : (restoreOnly ? 'Verify email to restore earlier chats' : 'Verify email for voice')}</button>
            {codeSent && <form onSubmit={event => {
              event.preventDefault();
              const code = new FormData(event.currentTarget).get('code');
              void voice('verify', { code }, () => { setVerified(true); setNotice('Email verified.'); if (restoreOnly) { setRestoreOnly(false); setMode('live'); void restoreHistory(); } });
            }}>
              <label>Verification code <input name="code" required pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" maxLength={6}/></label>
              <button className="btn btn-sm" disabled={busy}>Verify</button>
            </form>}
          </> : clock.active > 0 ? <>
          <span>Voice call · {formatTime(clock.active)} left</span>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => {
            const id = activeCall();
            if (id) { stopAudio(); void voice('end', { call_id: id }, syncClock); }
          }}>End call</button>
          <label>Dictation language <select value={language} disabled={listening} onChange={event => setLanguage(event.target.value)}><option value="en-US">English</option><option value="bn-BD">বাংলা</option></select></label>
          <button type="button" className="btn btn-sm" onClick={listen} disabled={busy} aria-pressed={listening}>{listening ? 'Stop microphone' : 'Use microphone'}</button>
          <label><input type="checkbox" checked={readReplies} onChange={event => { setReadReplies(event.target.checked); if (!event.target.checked) stopSpeaking(); }}/> Read replies aloud</label>
          {speaking && <button type="button" className="btn btn-sm" onClick={stopSpeaking}>Stop playback</button>}
          </> : <>
            {clock.wait > 0 && <span>Next call in {formatTime(clock.wait)}</span>}
            <button type="button" className="btn btn-sm" disabled={busy || clock.wait > 0} onClick={() => voice('start', {}, data => {
              syncClock(data);
              setReadReplies(Boolean(data.call_id));
              setNotice(data.call_id ? 'Use the microphone, then send your transcript.' : 'Wait for the break to finish.');
            })}>Start voice call</button>
          </>}
        </div>}
        <p className="widget-footer" role="status">{busy ? 'Working…' : notice || 'Your browser may use an online speech service. Review the transcript before sending.'}</p>
        <form className="widget-form" onSubmit={send}>
          <input aria-label="Message or transcript" placeholder="Type or dictate your message…" value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} disabled={busy}/>
          <button disabled={busy || listening || !draft.trim()} aria-label="Send message"><Icon name="send"/></button>
        </form>
      </>}
    </dialog>
  </>;
}

function slotLabel(timestamp) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(timestamp * 1000);
}

function formatTime(seconds) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
