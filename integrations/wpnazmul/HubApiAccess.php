<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
final class HubApiAccess {
    public function handle(Request $request, Closure $next) {
        if ($request->header('X-AP-Tech-Hub') !== '1') return $next($request);
        $secret = config('hub-integration.token');
        $allowed = $request->is('api/v1/admin/*') || preg_match('~^api/(session|admin/(hub-inbox(?:/\d+(?:/references|/draft)?)?|dashboard|profile|entries(?:/\d+)?|messages/\d+|upload))$~D', $request->path());
        abort_unless($allowed && is_string($secret) && strlen($secret) >= 48 && hash_equals($secret, (string)$request->bearerToken()) && in_array($request->server('REMOTE_ADDR'), ['127.0.0.1','::1']), 403);
        abort_if($request->is('api/v1/admin/logout'), 403);
        $owner=User::where('email','nazmulha30@gmail.com')->where('is_admin',true)->first();
        abort_unless($owner,403);
        Auth::setUser($owner);
        $request->setUserResolver(fn()=>$owner);
        $request->attributes->set('hub_admin_verified',true);
        return $next($request)->withHeaders(['Cache-Control'=>'private, no-store','Referrer-Policy'=>'no-referrer']);
    }
}
