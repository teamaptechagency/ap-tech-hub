<?php
require '/srv/wpnazmul-staging/backend/vendor/autoload.php';
$app=require '/srv/wpnazmul-staging/backend/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\{DB,Http,Mail};
use App\Workspace\{LeadGeneration,LeadReplyInbox,AdminAiSettings};
function check($value,$label){if(!$value)throw new RuntimeException($label);echo 'PASS '.$label."\n";}
LeadReplyInbox::schema();
$controller=$app->make(LeadGeneration::class);
$age=new ReflectionMethod($controller,'candidateAgeMatches');$metadata=new ReflectionMethod($controller,'researchMetadata');
$date=now()->subMonths(2)->toDateString();$source=['example.invalid/launch'=>true,'example.invalid/contact'=>true];
check($age->invoke($controller,['launch_date'=>$date,'launch_source'=>'https://example.invalid/launch'],'1-3',$source),'cited two-month startup accepted');
check(!$age->invoke($controller,['launch_date'=>$date,'launch_source'=>'https://unknown.invalid/launch'],'1-3',$source),'uncited startup age rejected');
check(!$age->invoke($controller,['launch_date'=>now()->subYear()->toDateString(),'launch_source'=>'https://example.invalid/launch'],'1-3',$source),'old business excluded from startup filter');
check(!$age->invoke($controller,[],'1-3',$source),'unknown startup date excluded');
check(!isset($metadata->invoke($controller,['phone'=>'+12025550123','phone_source'=>'javascript://example.invalid/contact'],$source)['phone']),'unsafe contact source rejected');
check(isset($metadata->invoke($controller,['phone'=>'+12025550123','phone_source'=>'https://example.invalid/contact'],$source)['phone']),'cited business phone retained');
$owner=App\Models\User::findOrFail(config('acquisition.owner_user_id'));$request=Illuminate\Http\Request::create('/test','POST',['tone'=>'friendly']);$request->setUserResolver(fn()=>$owner);
Mail::fake();Http::preventStrayRequests();
DB::beginTransaction();
try{
 $id=DB::table('workspace_leads')->insertGetId(['name'=>'QA startup fixture','email'=>'qa-'.bin2hex(random_bytes(6)).'@example.invalid','source'=>'https://example.invalid/contact','reason'=>'Publicly launched a training business','subject'=>'Fixture','body'=>'Fixture draft','status'=>'ready','created_at'=>now(),'updated_at'=>now()]);
 $lead=DB::table('workspace_leads')->find($id);
 $merge=new ReflectionMethod($controller,'mergeResearch');$merge->invoke($controller,$id,['country'=>'United Kingdom','service'=>'Training website','phone'=>'+12025550123']);
 LeadReplyInbox::outgoing($lead,'Fixture subject','Fixture body','accepted');LeadReplyInbox::outgoing($lead,'Fixture subject','Fixture body','accepted');
 $thread=LeadReplyInbox::ensureThread($lead);check(DB::table('hub_lead_mail_messages')->where('contact_id',$thread)->count()===1,'outgoing lead history is idempotent');
 check(DB::table('contact_messages')->where('id',$thread)->value('name')==='QA startup fixture','mail thread keeps lead name and email');
 DB::table('hub_lead_mail_messages')->insert(['contact_id'=>$thread,'fingerprint'=>hash('sha256','qa-reply:'.$id),'direction'=>'incoming','subject'=>'Fixture reply','body'=>'A reply for this business only.','status'=>'received','created_at'=>now()]);
 $view=$app->make(App\Http\Controllers\HubInboxController::class)->show($thread);
 check($view['is_lead']&&count($view['messages'])===2&&$view['messages'][1]->direction==='incoming','incoming reply and sent mail share the named inbox thread');
 $controller->archive($request,$id);check(DB::table('hub_lead_mail_messages')->where('contact_id',$thread)->exists(),'archive preserves mail history');
 if(AdminAiSettings::keyFor('openai')){
  $seen=false;Http::fake(['api.openai.com/*'=>function($r)use(&$seen){$seen=str_contains($r['input'],'Publicly launched a training business')&&str_contains($r['input'],'United Kingdom');return Http::response(['output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode(['subject'=>'Hello [[COMPANY]]','body'=>'Hi [[COMPANY]], a useful website for your new training business.'])]]]]],200);}]);
  $draft=$controller->generateDraft($request,$id);
  check($seen,'AI request includes recipient-specific research and service context');
  check(str_contains($draft['body'],'QA startup fixture'),'draft uses recipient context and company name');
 }else{throw new RuntimeException('OpenAI key missing; personalisation cannot be enabled');}
 echo "PASS verification invokes no SMTP sender\n";
}finally{DB::rollBack();echo "All fixture records rolled back\n";}
