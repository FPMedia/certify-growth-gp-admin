/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOTE: /api/* is proxied to the gateway by the runtime route handler at
  // app/api/[...path]/route.ts, which reads GATEWAY_URL per-request. A
  // next.config `rewrites()` would be baked into the build manifest and could
  // not see Railway's runtime GATEWAY_URL, so it is intentionally not used.
};

module.exports = nextConfig;
