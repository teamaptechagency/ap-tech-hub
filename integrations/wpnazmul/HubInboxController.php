<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
final class HubInboxController {
    public function notifications() {
        $events=[];
        foreach(DB::table('contact_messages')->where('status','unread')->latest('id')->limit(30)->get(['id','name','created_at']) as $row){
            $events[]=['key'=>'enquiry:'.$row->id,'title'=>'New website enquiry','body'=>$row->name,'href'=>'/wpnazmul/messages?tab=enquiries','createdAt'=>\Carbon\Carbon::parse($row->created_at)->toIso8601String()];
        }
        $latest=DB::table('acq_public_messages')->where('actor_kind','guest')->selectRaw('MAX(id) as id')->groupBy('conversation_id');
        foreach(DB::table('acq_public_messages as m')->joinSub($latest,'latest',fn($join)=>$join->on('m.id','=','latest.id'))->join('acq_public_conversations as c','c.id','=','m.conversation_id')->join('acq_guest_identities as g','g.id','=','c.guest_identity_id')->latest('m.id')->limit(30)->get(['m.id','m.created_at','c.public_id','g.first_name']) as $row){
            $events[]=['key'=>'public-chat:'.$row->id,'title'=>'New visitor message','body'=>$row->first_name,'href'=>'/wpnazmul/messages?tab=live&chat='.$row->public_id,'createdAt'=>\Carbon\Carbon::parse($row->created_at)->toIso8601String()];
        }
        $latest=DB::table('client_project_messages')->whereNotNull('client_id')->selectRaw('MAX(id) as id')->groupBy('project_id');
        foreach(DB::table('client_project_messages as m')->joinSub($latest,'latest',fn($join)=>$join->on('m.id','=','latest.id'))->join('client_projects as p','p.id','=','m.project_id')->latest('m.id')->limit(30)->get(['m.id','m.created_at','p.public_id','p.title']) as $row){
            $events[]=['key'=>'project-chat:'.$row->id,'title'=>'New project message','body'=>$row->title,'href'=>'/wpnazmul/orders/'.$row->public_id,'createdAt'=>\Carbon\Carbon::parse($row->created_at)->toIso8601String()];
        }
        return ['notifications'=>$events];
    }
    public function index(Request $request) {
        $query=DB::table('contact_messages')->orderByDesc('id');
        if($request->filled('before_id'))$query->where('id','<',(int)$request->query('before_id'));
        $rows=$query->limit(31)->get();$items=$rows->take(30)->values();
        return ['threads'=>$items,'has_more'=>$rows->count()>30,'next_cursor'=>$items->last()?->id];
    }
    public function show(int $id) {
        $row=DB::table('contact_messages')->where('id',$id)->first();abort_unless($row,404);
        $row->body=$row->message;
        return ['thread'=>$row,'replies'=>[]];
    }
    public function references(int $id) {
        abort_unless(DB::table('contact_messages')->where('id',$id)->exists(),404);
        return ['references'=>[],'supported'=>false];
    }
    public function draft(Request $request,int $id) {
        $input=$request->validate(['body'=>'required|string|max:4000']);
        $key=$request->header('Idempotency-Key');abort_unless(is_string($key)&&Str::isUuid($key),422);
        $enquiry=DB::table('contact_messages')->where('id',$id)->first();abort_unless($enquiry,404);
        DB::table('inbox_email_replies')->insertOrIgnore(['contact_message_id'=>$id,'admin_id'=>$request->user()->id,'request_key'=>$key,'recipient'=>$enquiry->email,'body'=>$input['body'],'status'=>'draft','created_at'=>now(),'updated_at'=>now()]);
        $saved=DB::table('inbox_email_replies')->where('request_key',$key)->first();
        abort_unless($saved&&(int)$saved->admin_id===(int)$request->user()->id&&(int)$saved->contact_message_id===$id&&$saved->body===$input['body']&&$saved->status==='draft',409);
        return ['status'=>'draft','message'=>'Draft saved. No email was sent.'];
    }
}
