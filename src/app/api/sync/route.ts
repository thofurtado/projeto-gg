import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function POST(req: Request) {
  try {
    const { key, data } = await req.json()

    if (redis) {
      // O SDK do Upstash já lida com objetos, não precisa de JSON.stringify obrigatoriamente, 
      // mas manteremos para garantir consistência na leitura
      await redis.set(key, JSON.stringify(data))
      return NextResponse.json({ synced: true, store: 'redis' })
    }

    return NextResponse.json({ synced: false, store: 'local' })
  } catch (error) {
    console.error("Erro na API POST Sync:", error)
    return NextResponse.json({ error: 'Erro na sync' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')

    if (!key) return NextResponse.json({ error: 'Key missing' }, { status: 400 })

    if (redis) {
      const data = await redis.get(key)
      // Se data for string, retornamos o parse. Se for objeto, retornamos direto.
      if (!data) return NextResponse.json(null)
      
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data
      return NextResponse.json(parsedData)
    }

    return NextResponse.json(null)
  } catch (error) {
    console.error("Erro na API GET Sync:", error)
    return NextResponse.json(null)
  }
}