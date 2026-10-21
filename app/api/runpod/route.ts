import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const { query } = await req.json();
  const apiKey = req.headers.get('x-api-key') || '';
  if (!apiKey) return NextResponse.json({ error: 'No key' }, { status: 401 });
  const res = await fetch('https://api.runpod.io/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  return NextResponse.json(data);
}
