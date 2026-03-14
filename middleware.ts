import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PASSWORD = 'demo123';
const COOKIE_NAME = 'staging_access';
const COOKIE_VALUE = 'granted';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === 'development') return NextResponse.next();
  const host = req.headers.get('host') || '';
  if (host !== 'app.trulab.pl') return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico' || pathname.startsWith('/images/')) {
    return NextResponse.next();
  }
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === COOKIE_VALUE) return NextResponse.next();
  if (req.method === 'POST') {
    return req.formData().then(form => {
      if (form.get('password') === PASSWORD) {
        const res = NextResponse.redirect(req.nextUrl);
        res.cookies.set(COOKIE_NAME, COOKIE_VALUE, { maxAge: MAX_AGE, path: '/' });
        res.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return res;
      }
      return htmlResponse();
    });
  }
  return htmlResponse();
}

function htmlResponse() {
  return new NextResponse(
    `<!DOCTYPE html><html><head><title>Staging environment</title></head><body style="font-family:sans-serif;text-align:center;padding:2em"><h2>Access restricted</h2><form method="POST"><input name="password" type="password" placeholder="Password" autofocus style="padding:0.5em;font-size:1em"/><button type="submit" style="margin-left:1em;padding:0.5em 1em">Submit</button></form></body></html>`,
    {
      status: 200,
      headers: { 'content-type': 'text/html', 'X-Robots-Tag': 'noindex, nofollow' },
    }
  );
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images/).*)'],
};
