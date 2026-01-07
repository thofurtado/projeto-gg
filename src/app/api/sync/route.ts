import { NextResponse } from 'next/server'
import { redis, isProd } from '@/lib/redis'

export async function POST(req: Request) {
  try {
    const { key, data } = await req.json()

    if (isProd && redis) {
      await redis.set(key, JSON.stringify(data))
      return NextResponse.json({ synced: true, store: 'redis' })
    }

    return NextResponse.json({ synced: false, store: 'local' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro na sync' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  if (!key) return NextResponse.json({ error: 'Key missing' }, { status: 400 })

  if (isProd && redis) {
    const data = await redis.get(key)
    return NextResponse.json(data ? JSON.parse(data) : null)
  }

  return NextResponse.json(null)
}