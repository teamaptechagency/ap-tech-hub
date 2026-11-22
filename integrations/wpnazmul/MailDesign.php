<?php
namespace App\Workspace;

final class MailDesign
{
    private static function escape(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
    private static function frame(string $eyebrow, string $title, string $content, string $footer): string
    {
        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef4ef;color:#243b2d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4ef"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dce8df;border-radius:18px;overflow:hidden"><tr><td style="padding:28px 30px;background:#192c23"><a href="https://wpnazmul.com" style="color:#eaf8ee;text-decoration:none;font-size:24px;font-weight:bold">Nazmul H<span style="color:#ade0bb">.</span></a><div style="color:#bed3c5;font-size:12px;margin-top:7px">Thoughtfully built websites. Clear communication.</div></td></tr><tr><td style="padding:32px 30px"><p style="margin:0 0 10px;color:#477454;font-size:11px;letter-spacing:1.8px;text-transform:uppercase">'.self::escape($eyebrow).'</p><h1 style="margin:0 0 22px;font-size:26px;line-height:1.3;color:#203a2b">'.self::escape($title).'</h1>'.$content.'</td></tr><tr><td style="padding:22px 30px;border-top:1px solid #e4ece6;color:#62776a;font-size:12px;line-height:1.7">'.self::escape($footer).'<br><a href="https://wpnazmul.com" style="color:#326b47">wpnazmul.com</a> &nbsp;·&nbsp; <a href="mailto:hello@wpnazmul.com" style="color:#326b47">hello@wpnazmul.com</a></td></tr></table></td></tr></table></body></html>';
    }
    public static function voice(string $code): string
    {
        return self::frame('Secure voice chat','Your verification code',
            '<p style="font-size:15px;line-height:1.8;margin:0 0 22px">Enter this code in the assistant to continue your voice conversation.</p><div style="padding:24px 12px;text-align:center;border:1px solid #c7dfce;border-radius:12px;background:#edf7ef;font-size:36px;font-weight:bold;letter-spacing:9px;color:#28583a">'.self::escape($code).'</div><p style="margin:18px 0 0;font-size:13px;color:#607665;line-height:1.8">Valid for <strong>10 minutes</strong>. Keep this code private. If you did not request it, you can ignore this email.</p>',
            'You received this email because a voice verification code was requested for this address.');
    }
    public static function outreach(string $subject, string $body, string $url): string
    {
        if (!str_starts_with($url,'https://wpnazmul.com/#lead-chat=')) throw new \InvalidArgumentException('Invalid conversation URL');
        $paragraphs=preg_split('/\n\s*\n/',trim($body));
        $copy=implode('',array_map(fn($p)=>'<p style="margin:0 0 18px;font-size:15px;line-height:1.85;color:#344d3d">'.nl2br(self::escape($p)).'</p>',$paragraphs));
        return self::frame('A conversation worth starting',$subject,$copy.'<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 12px"><tr><td bgcolor="#28583a" style="border-radius:10px"><a href="'.self::escape($url).'" style="display:inline-block;padding:15px 24px;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">Start live conversation &rarr;</a></td></tr></table><p style="font-size:12px;line-height:1.7;color:#62776a">Prefer email? Reply directly to this message.</p>',
            'A personal note from Nazmul Hasan. If this is not relevant, reply to let us know and we will respect your preference.');
    }
}
