<?php
require __DIR__.'/vendor/autoload.php';
$app=require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try { $result=App\Workspace\LeadReplyInbox::sync();echo json_encode($result,JSON_THROW_ON_ERROR)."\n"; }
catch(Throwable) { fwrite(STDERR,"Lead reply sync unavailable; check private server configuration.\n");exit(1); }
