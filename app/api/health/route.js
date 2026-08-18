export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const region = request.headers.get('x-vercel-id')?.split('::')[0] || 'local / edge';

  return Response.json({
    ok: true,
    service: 'edge-cloud-network-monitor',
    region,
    timestamp: new Date().toISOString(),
  });
}
