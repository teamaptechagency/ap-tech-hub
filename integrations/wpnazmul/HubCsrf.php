<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
final class HubCsrf extends ValidateCsrfToken {
    public function handle($request, Closure $next) {
        if ($request->attributes->get('hub_admin_verified') === true) return $next($request);
        return parent::handle($request,$next);
    }
}
