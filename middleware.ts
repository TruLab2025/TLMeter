import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ANALYZER_HOST = (process.env.ANALYZER_HOST || 'app.trulab.pl').toLowerCase();
const MARKETING_HOST = (process.env.MARKETING_HOST || 'trulab.pl').toLowerCase();
const STAGING_PASSWORD = (process.env.STAGING_PASSWORD || '').trim();
const COOKIE_NAME = process.env.STAGING_COOKIE_NAME || 'staging_access';
const COOKIE_VALUE = 'granted';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === 'development') return NextResponse.next();

  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  if (host === ANALYZER_HOST) {
    return await handleAnalyzerAccess(req);
  }

  return NextResponse.next();
}

async function handleAnalyzerAccess(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }

  if (!STAGING_PASSWORD) {
    return rewriteToAnalyzerEntry(req);
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === COOKIE_VALUE) {
    return rewriteToAnalyzerEntry(req);
  }

  if (req.method === 'POST') {
    const form = await req.formData();
    if (form.get('password') === STAGING_PASSWORD) {
      const res = NextResponse.redirect(req.nextUrl);
      res.cookies.set(COOKIE_NAME, COOKIE_VALUE, { maxAge: MAX_AGE, path: '/' });
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
    return htmlResponse();
  }

  return htmlResponse();
}

function rewriteToAnalyzerEntry(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/' || pathname === '') {
    return NextResponse.rewrite(new URL('/analyze', req.url));
  }

  if (pathname.startsWith('/analyze')) {
    return NextResponse.next();
  }

  const marketingRedirect = new URL(req.url);
  marketingRedirect.hostname = MARKETING_HOST;
  marketingRedirect.pathname = pathname;
  return NextResponse.redirect(marketingRedirect);
}

function htmlResponse() {
  return new NextResponse(
    `<!DOCTYPE html><html><head><title>TruLab Meter - staging</title></head><body style="font-family:sans-serif;text-align:center;padding:2em"><h2>Dostęp ograniczony</h2><form method="POST"><input name="password" type="password" placeholder="Hasło" autofocus style="padding:0.5em;font-size:1em"/><button type="submit" style="margin-left:1em;padding:0.5em 1em">Otwórz</button></form></body></html>`,
    {
      status: 200,
      headers: { 'content-type': 'text/html', 'X-Robots-Tag': 'noindex, nofollow' },
    }
  );
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images/|robots.txt|sitemap.xml).*)'],
};
