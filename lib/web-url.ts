/**
 * Public origin of certify-growth-gp-web ("Main app" link).
 *
 * Prefer runtime `WEB_URL` — Next inlines `NEXT_PUBLIC_*` at `next build`, and
 * the admin Dockerfile does not pass companion URLs as build ARGs.
 */
export function getWebUrl(): string | undefined {
  const runtime = process.env.WEB_URL?.trim();
  if (runtime) return runtime.replace(/\/$/, '');

  const pub = process.env.NEXT_PUBLIC_WEB_URL?.trim();
  if (pub) return pub.replace(/\/$/, '');

  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';
  return undefined;
}
