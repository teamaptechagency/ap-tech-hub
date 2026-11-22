"""Authorize voice only after the existing encrypted, expiring lead invite validates."""
from pathlib import Path
import shutil,time,sys
root=Path('/srv/wpnazmul-staging/backend')
def save(p,s):
    shutil.copy2(p,'/root/'+p.name+'.before-invited-voice-'+str(int(time.time())))
    p.write_text(s)
p=root/'app/Http/Controllers/PublicAcquisitionChatController.php'
s=p.read_text()
old="        return $this->start($request);\n    }\n\n    public function resume"
new="""        $result = $this->start($request);
        // The validated email invitation grants voice for this session/conversation only.
        $request->session()->put('invited_voice_conversation', $result['conversation_id']);
        $result['voice_authorized'] = true;
        return $result;
    }

    public function resume"""
if 'invited_voice_conversation' not in s:
    assert old in s
    save(p,s.replace(old,new,1))
p=root/'app/Http/Controllers/PublicVoiceController.php';s=p.read_text()
if 'private function invitedVoice' not in s:
    marker='    public function challenge(Request $request, string $id): array'
    helper="""    private function invitedVoice(Request $request, string $id): bool
    {
        return $request->session()->get('invited_voice_conversation') === $id;
    }

"""
    s=s.replace(marker,helper+marker)
    s=s.replace("if ($request->session()->get('voice_verified_email') !== $key) {", "if ($request->session()->get('voice_verified_email') !== $key && !$this->invitedVoice($request, $id)) {")
    s=s.replace("        return DB::transaction(function () use ($key, $session, $id) {", "        if ($this->invitedVoice($request, $id)) DB::table('acq_voice_access')->insertOrIgnore(['email_key' => $key]);\n        return DB::transaction(function () use ($key, $session, $id) {",1)
    s=s.replace("$active = $request->session()->get('voice_verified_email') === $key", "$active = ($request->session()->get('voice_verified_email') === $key || $this->invitedVoice($request, $id))")
    save(p,s)
p=root/'app/Services/Acquisition/LocalAcquisition.php';s=p.read_text()
if "'voice_authorized'=>" not in s:
    old="return ['conversation_id'=>$c->public_id,"
    assert old in s
    save(p,s.replace(old,"return ['voice_authorized'=>request()->session()->get('invited_voice_conversation') === $c->public_id,'conversation_id'=>$c->public_id,",1))
print('Invited voice uses validated session-scoped access; history verification stays unchanged')
if len(sys.argv)>1:
    p=Path(sys.argv[1])/'components/voice-assistant.jsx'
    s=p.read_text()
    s=s.replace(' : verified ? { voice_text: true }', ' : (verified || chat?.voice_authorized === true) ? { voice_text: true }')
    s=s.replace('{!verified ? <>','{!(verified || (!restoreOnly && chat?.voice_authorized === true)) ? <>')
    p.write_text(s)
