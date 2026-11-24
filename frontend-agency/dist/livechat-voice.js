(()=>{'use strict';
 const root=document.getElementById('ap-support');if(!root)return;
 const options=root.querySelector('.ap-support-options'),active=root.querySelector('.ap-chat-active'),windowEl=root.querySelector('.ap-chat-window');if(!options||!active)return;
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 18v-6a3 3 0 0 1 6 0v6M5 14v-3a7 7 0 0 1 14 0v3"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/></svg>';
 const entry=document.createElement('button');entry.type='button';entry.className='ap-voice-menu';entry.innerHTML=icon+'<span>Voice conversation<small>Talk naturally with Aptee</small></span><span aria-hidden="true">→</span>';options.append(entry);
 const tools=document.createElement('section');tools.className='ap-voice-tools ap-realtime';tools.hidden=true;tools.setAttribute('aria-label','Aptee voice assistant');
 tools.innerHTML='<div class="ap-voice-topline"><span><i></i> APTEE VOICE</span><time>00:00</time></div><fieldset class="ap-assistant-choice"><legend>Choose your AI assistant</legend><label><input type="radio" name="ap-assistant" value="female" checked><span>Female<span>Warm & clear</span></span></label><label><input type="radio" name="ap-assistant" value="male"><span>Male<span>Calm & natural</span></span></label></fieldset><div class="ap-voice-visual" aria-hidden="true"><div class="ap-voice-halo"></div><div class="ap-voice-orb">'+icon+'</div><div class="ap-voice-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><h3 class="ap-voice-heading">A little closer.<br>A real conversation.</h3><p class="ap-voice-note" role="status">Speak in your own language. Aptee will follow.</p><div class="ap-voice-actions"><button type="button" class="ap-voice-mic">Start voice chat</button><button type="button" class="ap-voice-exit" disabled>End call</button></div><div class="ap-voice-footer"><button type="button" class="ap-voice-speaker" aria-pressed="true">Speaker on</button><button type="button" class="ap-voice-transcript" aria-expanded="false">Transcript</button><button type="button" class="ap-voice-text">Text chat</button></div><p class="ap-voice-disclosure">AI-generated voice · Powered by OpenAI<br>Your microphone is shared only during a call.</p>';
 active.prepend(tools);
 const mic=tools.querySelector('.ap-voice-mic'),end=tools.querySelector('.ap-voice-exit'),speaker=tools.querySelector('.ap-voice-speaker'),note=tools.querySelector('.ap-voice-note'),heading=tools.querySelector('h3'),clock=tools.querySelector('time');
 let voice=false,openingVoice=false,pc=null,dc=null,media=null,audio=null,ctx=null,analyser=null,raf=0,timer=0,started=0,generation=0,connecting=false,currentSession=null,muted=false;
 const originalSubtitle=windowEl.querySelector('header small')?.textContent;
 const session=()=>{try{const s=JSON.parse(sessionStorage.getItem('aptech-livechat-v1'));return s?.id&&s?.token?s:null;}catch{return null;}};
 async function post(s,p,signal){const r=await fetch('/agency-api/chat/voice',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.token},body:JSON.stringify({id:s.id,...p}),signal});const value=await r.json();if(!r.ok)throw Error(value.error||'Voice is unavailable. Please try text chat.');return value;}
 function state(s){tools.dataset.voiceState=s;}
 function level(){if(!analyser)return;const a=new Uint8Array(analyser.frequencyBinCount);analyser.getByteTimeDomainData(a);const power=Math.sqrt(a.reduce((sum,v)=>sum+(v-128)**2,0)/a.length)/128;tools.style.setProperty('--voice-level',String(Math.min(1,power*5)));raf=requestAnimationFrame(level);}
 function cleanup(){generation++;connecting=false;clearInterval(timer);cancelAnimationFrame(raf);analyser=null;ctx?.close().catch(()=>{});ctx=null;media?.getTracks().forEach(t=>t.stop());media=null;dc?.close();dc=null;if(pc){pc.onconnectionstatechange=null;pc.close();pc=null;}if(audio){audio.pause();audio.srcObject=null;audio.remove();audio=null;}tools.style.setProperty('--voice-level','0');mic.disabled=false;mic.textContent='Start voice chat';mic.removeAttribute('aria-pressed');end.disabled=true;tools.querySelectorAll('input').forEach(r=>r.disabled=false);state('idle');}
 function stop(message='Call ended. Start again whenever you’re ready.'){const s=currentSession;currentSession=null;cleanup();if(s)post(s,{op:'end'}).catch(()=>{});heading.textContent='Here when you need us.';note.textContent=message;}
 async function start(){
  if(connecting)return;
  if(pc){muted=!muted;media?.getAudioTracks().forEach(t=>t.enabled=!muted);mic.textContent=muted?'Unmute microphone':'Mute microphone';mic.setAttribute('aria-pressed',String(!muted));state(muted?'muted':'listening');return;}
  const s=session();if(!s){note.textContent='Enter your name and accept the notice to begin.';return;}
  if(!window.RTCPeerConnection||!navigator.mediaDevices?.getUserMedia){note.textContent='This browser does not support voice calls. Please use text chat.';return;}
  const run=++generation;connecting=true;currentSession=s;mic.disabled=true;end.disabled=false;state('connecting');heading.textContent='Getting ready…';note.textContent='Allow microphone access to start your conversation.';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),35000);
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(run!==generation){stream.getTracks().forEach(t=>t.stop());return;}media=stream;
   const connection=new RTCPeerConnection();pc=connection;audio=document.createElement('audio');audio.autoplay=true;audio.hidden=true;audio.muted=speaker.getAttribute('aria-pressed')==='false';root.append(audio);
   connection.ontrack=e=>{if(run!==generation)return;audio.srcObject=e.streams[0];audio.play().catch(()=>{note.textContent='Tap Speaker on to hear Aptee.';});};
   stream.getTracks().forEach(t=>connection.addTrack(t,stream));
   try{ctx=new AudioContext();await ctx.resume();analyser=ctx.createAnalyser();analyser.fftSize=256;ctx.createMediaStreamSource(stream).connect(analyser);level();}catch{}
   dc=connection.createDataChannel('oai-events');dc.onmessage=({data})=>{if(run!==generation)return;try{const e=JSON.parse(data);if(e.type==='input_audio_buffer.speech_started'){state('listening');heading.textContent='I’m listening.';}if(e.type==='input_audio_buffer.speech_stopped'){state('thinking');heading.textContent='One moment…';}if(e.type==='output_audio_buffer.started'){state('speaking');heading.textContent='Aptee is speaking.';}if(e.type==='output_audio_buffer.stopped'){state(muted?'muted':'listening');heading.textContent='Your turn.';}if(e.type==='error'){note.textContent='Voice was interrupted. End the call and try again.';}}catch{}};
   connection.onconnectionstatechange=()=>{if(run!==generation)return;if(['failed','closed','disconnected'].includes(connection.connectionState))stop('Connection ended. Please start a new call.');};
   await connection.setLocalDescription(await connection.createOffer());
   const r=await post(s,{op:'start',assistant:tools.querySelector('input:checked').value,sdp:connection.localDescription.sdp},controller.signal);
   if(run!==generation){post(s,{op:'end'}).catch(()=>{});return;}
   await connection.setRemoteDescription({type:'answer',sdp:r.sdp});connecting=false;muted=false;mic.disabled=false;mic.textContent='Mute microphone';mic.setAttribute('aria-pressed','true');tools.querySelectorAll('input').forEach(r=>r.disabled=true);state('listening');heading.textContent='Go ahead. I’m listening.';note.textContent='Speak naturally. You can interrupt Aptee at any time.';started=Date.now();
   timer=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);clock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');if(seconds>=r.maxSeconds)stop('This call has ended. You can continue in text chat.');},1000);
  }catch(e){if(run!==generation)return;const message=e.name==='NotAllowedError'?'Microphone access was denied. Allow it in your browser or use text chat.':e.name==='NotFoundError'?'No microphone was found. Connect one or use text chat.':e.name==='AbortError'?'Connection timed out. Please try again.':e.message;stop(message);}finally{clearTimeout(timeout);}
 }
 function exit(){stop();voice=false;active.classList.remove('ap-voice-mode','ap-show-transcript');windowEl.classList.remove('ap-voice-window');tools.hidden=true;const subtitle=windowEl.querySelector('header small');if(subtitle)subtitle.textContent=originalSubtitle;}
 entry.onclick=()=>{voice=true;openingVoice=true;active.classList.add('ap-voice-mode');windowEl.classList.add('ap-voice-window');root.querySelector('.ap-live-open').click();openingVoice=false;tools.hidden=false;windowEl.querySelector('header small').textContent='Live AI voice · Your language, naturally';state('idle');};
 root.querySelector('.ap-live-open').addEventListener('click',()=>{if(!openingVoice)exit();});
 mic.onclick=start;end.onclick=()=>stop();tools.querySelector('.ap-voice-text').onclick=exit;
 speaker.onclick=()=>{const on=speaker.getAttribute('aria-pressed')!=='true';speaker.setAttribute('aria-pressed',String(on));speaker.textContent=on?'Speaker on':'Speaker off';if(audio){audio.muted=!on;if(on)audio.play().catch(()=>{});}};
 tools.querySelector('.ap-voice-transcript').onclick=e=>{const open=active.classList.toggle('ap-show-transcript');e.currentTarget.setAttribute('aria-expanded',String(open));};
 root.querySelector('.ap-chat-close').addEventListener('click',()=>stop());root.querySelector('.ap-chat-new').addEventListener('click',()=>stop());
 root.querySelector('.ap-support-launch').addEventListener('click',()=>{if(voice)exit();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&voice)stop();});window.addEventListener('pagehide',()=>stop());
})();
