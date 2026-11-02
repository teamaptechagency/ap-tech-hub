export const dynamic = "force-dynamic";
export function GET() {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>AP Tech Work Station</title><link rel="stylesheet" href="/workstation/app.css"><script src="/workstation/blog-editor.js" defer></script><script src="/workstation/app.js" defer></script></head><body><div id="workstation-ui-preview"><div id="workspace" class="ws-app"><div class="ws-loading">Connecting to AP Tech Work Station…</div></div></div></body></html>`, { headers: {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
  } });
}
