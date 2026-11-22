from pathlib import Path
import shutil,time
root=Path('/srv/wpnazmul-staging/backend')
def update(p,old,new):
 s=p.read_text()
 if old not in s:
  assert new in s,'Mail insertion point missing'
  return
 shutil.copy2(p,'/root/'+p.name+'.before-mail-design-'+str(int(time.time())))
 p.write_text(s.replace(old,new,1))
update(root/'app/Http/Controllers/PublicVoiceController.php',
 '$mailer->raw("Your assistant voice verification code is $code. It expires in 10 minutes.", function ($message) use ($email) {',
 '$mailer->html(\\App\\Workspace\\MailDesign::voice($code), function ($message) use ($email, $code) {\n                $message->text("Your assistant voice verification code is $code. It expires in 10 minutes.");')
update(root/'app/Workspace/LeadGeneration.php',
 "$sent = $mailer->raw($body, fn ($message) => $message->from($sender, 'Nazmul Hasan')",
 "$sent = $mailer->html(MailDesign::outreach($input['subject'], $input['body'], 'https://wpnazmul.com/#lead-chat='.$token), fn ($message) => $message->text($body)->from($sender, 'Nazmul Hasan')")
print('OTP and lead outreach now send HTML design with plain-text alternatives')
