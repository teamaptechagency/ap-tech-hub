import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const code=fs.readFileSync(new URL('../frontend-agency/dist/livechat-voice.js',import.meta.url),'utf8');
async function harness(getUserMedia){
 const els=new Map(),created=[],requests=[],timers=[];
 class Element{
  constructor(tag){this.tag=tag;this.hidden=false;this.disabled=false;this.dataset={};this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){}};this.attrs={};}
  querySelector(s){if(!els.has(s))els.set(s,new Element(s));return els.get(s);}
  querySelectorAll(){return [];}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}removeAttribute(k){delete this.attrs[k];}
  append(){}prepend(){}before(){}addEventListener(){}click(){}remove(){}
 }
 const root=new Element('root');
 const context={document:{getElementById:()=>root,createElement:tag=>{const e=new Element(tag);created.push(e);return e;},addEventListener(){}},window:{RTCPeerConnection:class{},addEventListener(){}},navigator:{mediaDevices:{getUserMedia}},sessionStorage:{getItem:()=>JSON.stringify({id:'test',token:'test'})},AbortController,fetch:async(...args)=>{requests.push(args);return {ok:true,json:async()=>({})};},clearInterval(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout:fn=>{timers.push(fn);return timers.length;}};
 vm.runInNewContext(code,context);
 els.get('input[type=email]').value='visitor@example.com';els.get('input[inputmode]').value='123456';await els.get('[data-verify-code]').onclick();requests.length=0;
 return {mic:els.get('.ap-voice-mic'),end:els.get('.ap-voice-exit'),help:created.find(e=>e.className==='ap-voice-permission-help'),requests,timers};
}
test('Android permission denial offers a manual retry and never starts a paid voice call',async()=>{
 let attempts=0;const h=await harness(async()=>{attempts++;throw Object.assign(Error('Permission denied'),{name:'NotAllowedError'});});
 await h.mic.onclick();assert.equal(h.help.hidden,false);assert.equal(h.mic.disabled,false);assert.equal(h.mic.textContent,'Try microphone again');assert.equal(h.requests.length,0);assert.equal(h.timers.length,0);
 await h.mic.onclick();assert.equal(attempts,2);assert.equal(h.help.hidden,false);
});
test('waiting on the browser permission prompt has no connection timeout; late grants release the microphone',async()=>{
 let resolve;let stopped=false;const h=await harness(()=>new Promise(r=>resolve=r));
 const pending=h.mic.onclick();assert.equal(h.timers.length,0);assert.equal(h.requests.length,0);
 h.end.onclick();resolve({getTracks:()=>[{stop(){stopped=true;}}]});await pending;
 assert.equal(stopped,true);assert.equal(h.requests.length,0);assert.equal(h.mic.disabled,false);
});
