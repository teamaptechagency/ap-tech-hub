from pathlib import Path
import shutil,time
backend=Path('/srv/wpnazmul-staging/backend');source=Path(__file__).parent
backup=Path('/root/wpn-lead-enhancements-'+str(int(time.time())));backup.mkdir(mode=0o700)
for rel in ['app/Workspace/LeadGeneration.php','routes/workspace.php']:
 p=backend/rel;shutil.copy2(p,backup/p.name)
p=backend/'app/Workspace/LeadGeneration.php';s=p.read_text()
if 'use HubLeadFeatures;' not in s:s=s.replace('final class LeadGeneration\n{','final class LeadGeneration\n{\n    use HubLeadFeatures;',1)
s=s.replace("'next' => 'sometimes|boolean'","'next' => 'sometimes|boolean', 'business_age'=>'sometimes|in:any,0-1,1-3,3-6'")
s=s.replace("'input' => 'Search for businesses", "'input' => $this->researchInstructions($request).' Search for businesses",1)
marker="            $email = strtolower(trim($candidate['email']));"
if 'candidateAgeMatches($candidate' not in s:s=s.replace(marker,"            if (!$this->candidateAgeMatches($candidate,$data['business_age']??'any',$sourceKeys)) continue;\n"+marker,1)
marker="        return $this->index($request) + ['added' => $added];"
if 'mergeResearch($leadId' not in s:
 target="        }\n"+marker
 addition="            $leadId=DB::table('workspace_leads')->where('email',$email)->value('id');\n            if($leadId)$this->mergeResearch((int)$leadId,$this->researchMetadata($candidate,$sourceKeys));\n"
 s=s.replace(target,addition+target,1)
s=s.replace("'input'=>$tone,","'input'=>$tone.'. Recipient facts: '.$this->draftContext($id,$lead),",1)
s=s.replace('Use the literal [[CONTEXT]] placeholder on its own line for an optional owner-supplied sentence.', 'Use the supplied business facts to write a distinct, useful proposal for that recipient. Mention only evidenced needs and their selected service. Do not merely swap names. Do not invent website defects, budgets or buying intent.')
start=s.find('        // Retain a recipient-specific paragraph')
if start>=0:
 end=s.index("        return ['subject'=>$subject",start);s=s[:start]+s[end:]
marker="        $record->update(['status' => $status, 'updated_at' => now()]);"
if 'LeadReplyInbox::outgoing' not in s:s=s.replace(marker,marker+"\n        LeadReplyInbox::outgoing($lead,$input['subject'],$body,$status);",1)
p.write_text(s)
p=backend/'routes/workspace.php';s=p.read_text().replace("'archive'])->whereNumber('id')->middleware('throttle:5,1')","'archive'])->whereNumber('id')->middleware('throttle:60,1')")
if "'{id}/research-contacts'" not in s:
 marker="Route::prefix('admin/leads')->group(function () {"
 s=s.replace(marker,marker+"\n    Route::post('{id}/research-contacts', [\\App\\Workspace\\LeadGeneration::class,'researchContacts'])->whereNumber('id')->middleware('throttle:6,1');\n    Route::post('{id}/mail-thread', [\\App\\Workspace\\LeadGeneration::class,'mailThread'])->whereNumber('id');",1)
p.write_text(s)
for name in ['HubLeadFeatures.php','LeadReplyInbox.php']:
 p=backend/'app/Workspace'/name;shutil.copyfile(source/name,p);p.chmod(0o644)
print('Lead enhancements installed with rollback copies:',backup)

p=backend/'app/Workspace/LeadGeneration.php';s=p.read_text()
s=s.replace("JSON_MERGE_PATCH(IF(JSON_EXTRACT(details, '$.archived') = true, JSON_OBJECT('archived', true), JSON_OBJECT()), VALUES(details))","JSON_MERGE_PATCH(COALESCE(details,JSON_OBJECT()), VALUES(details))")
s=s.replace("        LeadReplyInbox::outgoing($lead,$input['subject'],$body,$status);","        try { LeadReplyInbox::outgoing($lead,$input['subject'],$body,$status); } catch (\\Throwable) { logger()->warning('Lead inbox history pending sync.'); }")
p.write_text(s)
shutil.copyfile(source/'hub-mail-reader.mjs',backend/'hub-mail-reader.mjs')
(backend/'hub-mail-reader.mjs').chmod(0o644)
