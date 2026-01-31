import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, targetDays, waterGoal } = body

        if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

        const user = await prisma.user.update({
            where: { username },
            data: {
                targetDays: targetDays !== undefined ? targetDays : undefined,
                waterGoal: waterGoal !== undefined ? waterGoal : undefined,
            }
        })

        return NextResponse.json({ success: true, user })
    } catch (error) {
        console.error("Erro ao atualizar config usuário:", error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
