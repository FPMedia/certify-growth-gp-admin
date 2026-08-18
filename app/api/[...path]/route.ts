import { NextRequest } from 'next/server';

// Proxy every /api/* request to the gateway at request time.
// GATEWAY_URL is read per-request so it reflects the runtime environment
// (Railway private networking) rather than being baked at build time.
export const dynamic = 'force-dynamic';

const HOP_BY_HOP = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade'];

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const gateway = process.env.GATEWAY_URL ?? 'http://127.0.0.1:8080';
  const { path } = await params;
  const target = `${gateway}/api/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');
  for (const h of HOP_BY_HOP) headers.delete(h);

  const init: RequestInit = { method: req.method, headers, redirect: 'manual' };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
    // undici requires duplex when a body is present
    (init as RequestInit & { duplex: 'half' }).duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    return Response.json(
      { error: 'Bad gateway', detail: String(err) },
      { status: 502 },
    );
  }

  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete('content-encoding');
  resHeaders.delete('content-length');
  for (const h of HOP_BY_HOP) resHeaders.delete(h);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
};
