
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const username = searchParams.get('username')

        if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

        const user = await prisma.user.findUnique({
            where: { username },
            include: { team: true }
        })

        if (!user || !user.teamId) {
            return NextResponse.json({ hasTeam: false, role: user?.role || 'MEMBER' })
        }

        // Buscar todos os membros do time
        const members = await prisma.user.findMany({
            where: { teamId: user.teamId },
            include: {
                dailyLogs: {
                    select: { dayScore: true }
                }
            }
        })

        // Processar dados e calcular totais
        // Processar dados e calcular totais
        const leaderboard = members.map(m => {
            const totalScore = m.dailyLogs.reduce((acc, log) => acc + log.dayScore, 0)
            return {
                username: m.username,
                role: (m as any).role,
                totalScore,
                isLeader: (m as any).role === 'LEADER'
            }
        }).sort((a, b) => b.totalScore - a.totalScore) // Ordenar do maior para o menor

        return NextResponse.json({
            hasTeam: true,
            teamName: user.team?.name,
            isLeader: (user as any).role === 'LEADER' || (user as any).leaderId === user.id, // Compatibilidade e segurança
            role: (user as any).role, // RBAC Frontend
            teamId: user.team?.id,
            members: leaderboard
        })

    } catch (error: any) {
        console.error("Erro Team Members:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
