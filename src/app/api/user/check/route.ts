
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username } = body

        if (!username) {
            return NextResponse.json({ valid: false }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { username }
        })

        if (!user) {
            return NextResponse.json({ valid: false }, { status: 404 })
        }

        // Retorna dados básicos e role para o frontend atualizar se precisar
        return NextResponse.json({
            valid: true,
            role: user.role,
            teamId: user.teamId
        })

    } catch (error) {
        return NextResponse.json({ valid: false }, { status: 500 })
    }
}
