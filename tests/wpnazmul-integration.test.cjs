const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(file,overrides={}){const filename=path.resolve(__dirname,'..',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const req=m.require.bind(m);m.require=n=>Object.hasOwn(overrides,n)?overrides[n]:req(n);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
function access(session,row){return load('lib/wpnazmul-access.ts',{'@/lib/auth':{auth:async()=>session},'@/lib/prisma':{prisma:{user:{findUnique:async()=>row}}}});}
test('only active Super Admin or exact owner email qualifies',async()=>{
 const {wpNazmulEligible:eligible}=access();
 assert.equal(eligible({role:'SUPER_ADMIN',accountStatus:'ACTIVE'}),true);
 assert.equal(eligible({role:'ADMIN',email:'nazmulha30@gmail.com',accountStatus:'ACTIVE'}),true);
 for(const user of [null,{role:'ADMIN',email:'other@example.com',accountStatus:'ACTIVE'},{role:'SUPER_ADMIN',accountStatus:'DISABLED'},{email:'nazmulha30@gmail.com.attacker.test',accountStatus:'ACTIVE'}])assert.equal(eligible(user),false);
 assert.equal(await access({user:{id:'1',role:'SUPER_ADMIN'}},{role:'ADMIN',accountStatus:'ACTIVE'}).wpNazmulAccess(),null);
 assert.equal(await access({user:{id:'1',role:'CLIENT'}},{role:'SUPER_ADMIN',accountStatus:'ACTIVE'}).wpNazmulAccess(),null);
});
function route(allowed){return load('app/api/wp-admin/[...path]/route.ts',{'@/lib/wpnazmul-access':{wpNazmulAccess:async()=>allowed?{id:'owner'}:null},'next/server':{NextResponse:{json:(v,o)=>Response.json(v,o)}}});}
const ctx=path=>({params:Promise.resolve({path})});
test('unauthorized bridge and invalid/escaping paths are blocked without forwarding',async()=>{
 const denied=route(false);assert.equal((await denied.GET(new Request('https://hub.test/api/wp-admin/workspace/session'),ctx(['workspace','session']))).status,403);
 const api=route(true);for(const parts of [['legacy','login'],['workspace','logout'],['workspace','..'],['workspace','https:evil']])assert.ok([400,403].includes((await api.GET(new Request('https://hub.test/api/wp-admin/a'),ctx(parts))).status));
 assert.equal((await api.POST(new Request('https://hub.test/api/wp-admin/workspace/leads',{method:'POST',headers:{host:'hub.test',origin:'https://evil.test'}}),ctx(['workspace','leads']))).status,403);
});
test('bridge forwards only fixed WP origin and server credential, not browser cookies',async()=>{
 const oldFetch=global.fetch,oldToken=process.env.WPN_HUB_TOKEN;process.env.WPN_HUB_TOKEN='test-only-server-credential';let target,headers;
 global.fetch=async(url,options)=>{target=String(url);headers=options.headers;return Response.json({leads:[]});};
 try{const r=await route(true).GET(new Request('https://hub.test/api/wp-admin/workspace/leads?stage=new',{headers:{cookie:'private-hub-session'}}),ctx(['workspace','leads']));assert.equal(r.status,200);assert.equal(target,'http://127.0.0.1:18027/api/v1/admin/leads?stage=new');assert.equal(headers.get('Authorization'),'Bearer test-only-server-credential');assert.equal(headers.has('Cookie'),false);assert.equal((await r.text()).includes('test-only-server-credential'),false);}finally{global.fetch=oldFetch;if(oldToken===undefined)delete process.env.WPN_HUB_TOKEN;else process.env.WPN_HUB_TOKEN=oldToken;}
});
