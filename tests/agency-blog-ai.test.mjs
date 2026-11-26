import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBlog,rewriteInsight,hubBlogGenerate,publicBlogImage} from '../integrations/agency-blog-ai.mjs';

const brief={instructions:'Write a practical original article for business owners.',thumbnailTheme:'Forest green editorial illustration.'};
test('missing AI key fails before making a paid request',async()=>{
  let calls=0;await assert.rejects(generateBlog(brief,{keys:[],request:async()=>{calls++;}}),/keys are not configured/);assert.equal(calls,0);
});
test('incomplete text never triggers image generation or publication',async()=>{
  let calls=0;await assert.rejects(generateBlog(brief,{keys:['test-key'],request:async()=>{calls++;return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'{"title":"Incomplete"}'}]}]})};}}),/incomplete article/);assert.equal(calls,1);
});
test('provider errors do not leak the response body or key',async()=>{
  await assert.rejects(generateBlog(brief,{keys:['private-secret'],request:async()=>({ok:false,status:429,json:async()=>({error:'private-secret'})})}),e=>e.message.includes('429')&&!e.message.includes('private-secret'));
});
test('generation endpoint rejects unauthenticated requests',async()=>{
  let status;await hubBlogGenerate({method:'POST',headers:{},socket:{remoteAddress:'127.0.0.1'}},{},{send:(_,s)=>{status=s;},body:()=>{throw Error('must not read body');}});assert.equal(status,403);
});
test('public image route rejects filesystem traversal',()=>{
  let status;publicBlogImage({method:'GET',url:'/api/agency/public/blog-ai/../../.env'},{},(_,s)=>{status=s;});assert.equal(status,404);
});
test('rewriting sends JSON-mode input and does not request an image',async()=>{
 let calls=0;
 await assert.rejects(rewriteInsight({title:'Existing article',content:'Public source text'},{keys:['test-key'],request:async(url,options)=>{
  calls++;assert.match(url,/responses$/);const body=JSON.parse(options.body);assert.match(body.input,/json/i);assert.match(body.instructions,/\[CARDS\]/);
  return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'{}'}]}]})};
 }}),/incomplete article/);
 assert.equal(calls,1);
});
