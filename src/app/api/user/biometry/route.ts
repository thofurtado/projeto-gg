import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, biometry } = body

        if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

        const user = await prisma.user.findUnique({
            where: { username }
        })

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const log = await prisma.biometryLog.create({
            data: {
                userId: user.id,
                weight: biometry.weight,
                height: biometry.height,
                waist: biometry.waist,
                chest: biometry.chest,
                armL: biometry.armL,
                armR: biometry.armR,
            }
        })

        return NextResponse.json({ success: true, log })
    } catch (error) {
        console.error("Erro ao salvar biometria:", error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
