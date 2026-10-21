
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { apiKey, query } = await req.json()
    if (!apiKey || !query) {
      return NextResponse.json({ errors: [{ message: 'Missing apiKey or query' }] }, { status: 400 })
    }
    const res = await fetch('https://api.runpod.io/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
      body: JSON.stringify({ query }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ errors: [{ message: e.message }] }, { status: 500 })
  }
}
