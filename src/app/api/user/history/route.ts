
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const username = searchParams.get('username')

        if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        // Buscar últimos 30 dias de logs
        const logs = await prisma.dailyLog.findMany({
            where: { userId: user.id },
            orderBy: { date: 'desc' },
            take: 30
        })

        // Total geral de pontos
        const allLogs = await prisma.dailyLog.aggregate({
            where: { userId: user.id },
            _sum: { dayScore: true }
        })

        return NextResponse.json({
            history: logs,
            totalScore: allLogs._sum.dayScore || 0
        })

    } catch (error: any) {
        console.error("Erro History:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
