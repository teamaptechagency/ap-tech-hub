<?php
require $argv[1];
use App\Workspace\MailDesign;
function check($ok,$message){if(!$ok)throw new RuntimeException($message);echo "PASS $message\n";}
$url='https://wpnazmul.com/#lead-chat=fixture_token';
$html=MailDesign::outreach('A <project> & proposal',"Hello <script>alert(1)</script>\n\nA useful next step.",$url);
check(str_contains($html,'A &lt;project&gt; &amp; proposal'),'subject escaped');
check(!str_contains($html,'<script>'),'recipient body cannot inject HTML');
check(str_contains($html,'href="'.$url.'"'),'unique invitation URL retained');
check(!str_contains(strip_tags($html),'fixture_token'),'long invite token is hidden behind button');
check(str_contains($html,'Start live conversation'),'conversation action present');
$otp=MailDesign::voice('123456');check(str_contains($otp,'123456')&&str_contains($otp,'10 minutes'),'OTP and expiry present');
check(str_contains($otp,'max-width:600px')&&str_contains($otp,'role="presentation"'),'email uses responsive table layout');
try{MailDesign::outreach('Test','Body','javascript:alert(1)');throw new RuntimeException('unsafe URL accepted');}catch(InvalidArgumentException){echo "PASS unsafe CTA rejected\n";}
