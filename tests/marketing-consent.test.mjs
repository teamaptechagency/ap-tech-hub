import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../frontend-agency/dist/marketing.js',import.meta.url),'utf8');
async function run(consent,config){
 const scripts=[],listeners={},events=[];
 const element=()=>({style:{},setAttribute(){},append(){},remove(){},querySelectorAll:()=>[]});
 const context={window:{},navigator:{},location:{hostname:'aptechagency.com',origin:'https://aptechagency.com',pathname:'/services/ui-ux-design/'},document:{referrer:'',head:{append:s=>scripts.push(s.src)},body:{append(){}},createElement:element,getElementById:()=>null,addEventListener:(name,fn)=>listeners[name]=fn},localStorage:{getItem:()=>JSON.stringify(consent)},fetch:async()=>({ok:true,json:async()=>config}),URL};
 vm.runInNewContext(code,context);await new Promise(r=>setImmediate(r));
 context.window.gtag=(...args)=>events.push(args);
 return {context,scripts,listeners,events};
}
test('declining or absent IDs never loads third-party trackers',async()=>{
 assert.deepEqual((await run({analytics:false,marketing:false},{ga4:'G-EXAMPLE123',pixel:'123456789'})).scripts,[]);
 assert.deepEqual((await run({analytics:true,marketing:true},{})).scripts,[]);
});
test('analytics-only consent loads Google without Meta and contact payload excludes recipient',async()=>{
 const h=await run({analytics:true,marketing:false},{ga4:'G-EXAMPLE123',pixel:'123456789'});
 assert.equal(h.scripts.length,1);assert.match(h.scripts[0],/googletagmanager/);
 h.listeners.click({target:{closest:()=>({getAttribute:()=> 'mailto:private@example.com?body=private-message'})}});
 assert.equal(h.events[0][1],'contact_click');assert.equal(JSON.stringify(h.events).includes('private'),false);
});
