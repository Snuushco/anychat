import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { lat, lon } = await req.json()
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=nl`,
      { headers: { 'User-Agent': 'AnyChat/1.0' } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocode failed' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({
      city: data.address?.city || data.address?.town || data.address?.village || '',
      country: data.address?.country || '',
      display_name: data.display_name || '',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
