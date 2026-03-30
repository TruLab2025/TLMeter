This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## TL Meter docs

- Licensing manual: `docs/LICENSING.md`
- Plans enforcement audit: `docs/PLAN_ENFORCEMENT.md`
- Payments integration note: checkout sends `device_id` and webhook issues an access key (see `docs/LICENSING.md`)

## Env (licensing)

- Backend (API): `LICENSE_TOKEN_SECRET` (required in production), `PAYMENT_CONTEXT_SECRET` (optional; defaults to `LICENSE_TOKEN_SECRET`), `LICENSE_STORE_DIR` (where entitlements/devices are stored), `LICENSE_MODE` (`stateless` default, set `db` to use legacy), `LICENSE_REQUIRE_PROOF` (`1` forces PoP in dev), `LICENSE_ENFORCE_STORE` (`0` disables entitlement checks), `PUBLIC_APP_URL`, `PUBLIC_API_URL`
- Host split: `ANALYZER_HOST` (host that serves the analyzer UI), `MARKETING_HOST` (host for marketing routes), `STAGING_PASSWORD` (set only in staging to gate the analyzer; leave empty to expose it openly), `STAGING_COOKIE_NAME` (cookie key for staging access, defaults to `staging_access`), `NEXT_PUBLIC_ANALYZER_URL` (marketing links to the analyzer, e.g. `https://app.trulab.pl`).
- SEO toggle: `DISABLE_INDEXING` (set to `true` while the site is private so Next.js renders `noindex,nofollow`, unset before launch); `PUBLIC_APP_URL` (base URL used to generate canonical/metadata links); `robots.txt` and `sitemap.xml` live in `public/` and point at `trulab.pl`, so keep them current before shipping.

## Host split & deployment

1. Build once with `npm run build` (or `yarn build`/`pnpm build`). The artifact lives in `.next` alongside `app`, `public`, etc. The same build powers both domains.
2. On the Apache server keep one Node/PM2 process per release—place the built files inside the main site directory and point Apache's `ProxyPass`/`ProxyPassReverse` at `http://localhost:3000`. In your `app` subdirectory you can keep the same build if you prefer to keep the Git checkout separate, but both hosts must proxy to the same Node server.
3. Configure two `VirtualHost`s (one for `trulab.pl`, one for `app.trulab.pl`) that preserve the incoming host header so Next.js can read it. Middleware rewrites `app.trulab.pl/` to `/analyze` and routes any other paths back to the marketing host, so the landing pages stay on `trulab.pl` while the analyzer lives at the subdomain.
   ```apacheconf
   <VirtualHost *:80>
     ServerName trulab.pl
     ProxyPass / http://127.0.0.1:3000/
     ProxyPassReverse / http://127.0.0.1:3000/
     ProxyPreserveHost On
   </VirtualHost>

   <VirtualHost *:80>
     ServerName app.trulab.pl
     ProxyPass / http://127.0.0.1:3000/
     ProxyPassReverse / http://127.0.0.1:3000/
     ProxyPreserveHost On
   </VirtualHost>
   ```
4. Keep `NEXT_PUBLIC_ANALYZER_URL` in `.env` set to `https://app.trulab.pl` so every CTA from the landing site points at the analyzer. On the analyzer host you still hit `/api/*` directly because middleware ignores that namespace, so your existing API proxying works unchanged.
5. To update the code, pull from Git, re-run `npm install` if dependencies changed, rebuild once, and restart the Node process. No second build is needed because the middleware decides which domain sees which page.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
