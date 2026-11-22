<?php
namespace App\Workspace;
use Illuminate\Support\Facades\{DB,Schema,Crypt};
use Illuminate\Database\Schema\Blueprint;
use Symfony\Component\Process\Process;
final class LeadReplyInbox {
    public static function schema():void {
        if(!Schema::hasTable('hub_lead_mail_threads'))Schema::create('hub_lead_mail_threads',function(Blueprint $t){$t->unsignedBigInteger('lead_id')->primary();$t->unsignedBigInteger('contact_id')->unique();});
        if(!Schema::hasTable('hub_lead_mail_messages'))Schema::create('hub_lead_mail_messages',function(Blueprint $t){$t->id();$t->unsignedBigInteger('contact_id')->index();$t->string('fingerprint',64)->unique();$t->string('direction',12);$t->string('subject',255);$t->text('body');$t->string('status',30);$t->timestamp('created_at');});
        if(!Schema::hasTable('hub_lead_mail_sync'))Schema::create('hub_lead_mail_sync',function(Blueprint $t){$t->string('account',64)->primary();$t->unsignedBigInteger('last_uid')->default(0);$t->string('uid_validity',60)->default('');$t->unsignedBigInteger('last_attempt')->default(0);});
    }
    public static function ensureThread(object $lead):int {
        self::schema();
        return DB::transaction(function()use($lead){
            DB::table('workspace_leads')->where('id',$lead->id)->lockForUpdate()->first();
            $existing=DB::table('hub_lead_mail_threads')->where('lead_id',$lead->id)->value('contact_id');if($existing)return (int)$existing;
            $id=DB::table('contact_messages')->insertGetId(['name'=>mb_substr($lead->name,0,120),'email'=>$lead->email,'company'=>$lead->name,'service'=>'Lead outreach','message'=>'Email conversation with '.$lead->name,'status'=>'read','created_at'=>now(),'updated_at'=>now()]);
            DB::table('hub_lead_mail_threads')->insert(['lead_id'=>$lead->id,'contact_id'=>$id]);return (int)$id;
        });
    }
    public static function outgoing(object $lead,string $subject,string $body,string $status):void {
        $id=self::ensureThread($lead);
        DB::table('hub_lead_mail_messages')->insertOrIgnore(['contact_id'=>$id,'fingerprint'=>hash('sha256','outreach:'.$lead->id.':'.$subject.':'.$body),'direction'=>'outgoing','subject'=>mb_substr($subject,0,255),'body'=>$body,'status'=>$status,'created_at'=>now()]);
    }
    public static function messages(int $id):array {
        self::schema();return DB::table('hub_lead_mail_messages')->where('contact_id',$id)->orderBy('created_at')->orderBy('id')->limit(200)->get()->all();
    }
    public static function sync():array {
        self::schema();$stored=DB::table('admin_integration_settings')->where('kind','mail')->value('encrypted_settings');$settings=$stored?Crypt::decrypt($stored):[];
        if(($settings['host']??'')!=='smtp.hostinger.com'||empty($settings['secret'])||strtolower($settings['username']??'')!=='hello@wpnazmul.com')return ['configured'=>false,'imported'=>0,'message'=>'Connect hello@wpnazmul.com in Integrations to receive replies.'];
        $account=hash('sha256',strtolower($settings['username']));DB::table('hub_lead_mail_sync')->insertOrIgnore(['account'=>$account]);
        if(!DB::table('hub_lead_mail_sync')->where('account',$account)->where('last_attempt','<',time()-40)->update(['last_attempt'=>time()]))return ['configured'=>true,'imported'=>0,'message'=>'Mail sync is current.'];
        $state=DB::table('hub_lead_mail_sync')->where('account',$account)->first();
        $leads=DB::table('workspace_leads')->select('id','name','email')->limit(2000)->get()->keyBy(fn($l)=>strtolower($l->email));
        $process=new Process(['/usr/bin/node',base_path('hub-mail-reader.mjs')]);$process->setTimeout(40);$process->setInput(json_encode(['username'=>$settings['username'],'password'=>$settings['secret'],'lastUid'=>$state->last_uid,'uidValidity'=>$state->uid_validity,'senders'=>$leads->keys()->all()],JSON_THROW_ON_ERROR));
        try{$process->mustRun();$result=json_decode($process->getOutput(),true,512,JSON_THROW_ON_ERROR);if(!isset($result['messages'],$result['lastUid'],$result['uidValidity']))throw new \RuntimeException('Invalid mail result');}
        catch(\Throwable){return ['configured'=>true,'imported'=>0,'error'=>'Mailbox sync failed. Check the mailbox password and IMAP access in Integrations.'];}
        $imported=0;
        foreach($result['messages'] as $mail){$lead=$leads->get(strtolower($mail['from']??''));if(!$lead)continue;$id=self::ensureThread($lead);
            $inserted=DB::table('hub_lead_mail_messages')->insertOrIgnore(['contact_id'=>$id,'fingerprint'=>hash('sha256',$account.':'.($mail['messageId']?:$result['uidValidity'].':'.$mail['uid'])),'direction'=>'incoming','subject'=>mb_substr($mail['subject'],0,255),'body'=>mb_substr($mail['body'],0,16000),'status'=>'received','created_at'=>\Carbon\Carbon::parse($mail['date'])]);
            if($inserted){$imported++;DB::table('contact_messages')->where('id',$id)->update(['message'=>mb_substr($mail['body'],0,16000),'status'=>'unread','updated_at'=>now()]);}
        }
        DB::table('hub_lead_mail_sync')->where('account',$account)->update(['last_uid'=>$result['lastUid'],'uid_validity'=>$result['uidValidity']]);
        return ['configured'=>true,'imported'=>$imported,'message'=>'Mailbox synced. No email was sent.'];
    }
}
