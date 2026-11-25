import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedServiceContext} from '../integrations/agency-service-context.mjs';
test('AI reads published services, not unsaved drafts',()=>{
 const touched=[];const text=approvedServiceContext({directory:'/test',read:p=>{touched.push(p);return {draft:{content:{services:[{slug:'custom',shortTitle:'Current approved service',intro:'Approved scope'}]}}};}});
 assert.match(text,/Current approved service/);assert.match(text,/Approved scope/);assert.equal(touched.length,1);assert.match(touched[0],/published\.json$/);
});
test('missing approved catalog fails closed without invented services',()=>{assert.match(approvedServiceContext({read:()=>{throw Error('Missing');}}),/unavailable/);});
