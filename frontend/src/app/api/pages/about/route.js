export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    const res = await fetch(`${backendUrl}/api/pages/about`, { cache: 'no-store' });
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
