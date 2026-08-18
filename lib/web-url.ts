/**
 * Public origin of certify-growth-gp-web ("Main app" link).
 *
 * Read via `process.env[name]` (dynamic key) so Next cannot inline the value at
 * `next build`.
 */
function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value.replace(/\/$/, '') : undefined;
}

export function getWebUrl(): string | undefined {
  const runtime = readEnv('WEB_URL');
  if (runtime) return runtime;

  const pub = readEnv('NEXT_PUBLIC_WEB_URL');
  if (pub) return pub;

  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';
  return undefined;
}
