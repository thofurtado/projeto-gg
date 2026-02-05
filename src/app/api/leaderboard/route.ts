
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // 1. Calcular Ranking de Times
        // Como o prisma não faz agregação profunda fácil em relations, vamos buscar os dados e agregar
        const teams = await prisma.team.findMany({
            include: {
                members: {
                    include: {
                        dailyLogs: {
                            select: { dayScore: true }
                        }
                    }
                }
            }
        })

        const rankedTeams = teams.map(team => {
            const totalScore = team.members.reduce((acc, member) => {
                const memberScore = member.dailyLogs.reduce((sum, log) => sum + log.dayScore, 0)
                return acc + memberScore
            }, 0)

            return {
                id: team.id,
                name: team.name,
                color: team.color,
                score: totalScore,
                memberCount: team.members.length
            }
        })
            .sort((a, b) => b.score - a.score)
            .slice(0, 5) // Top 5 Times

        // 2. Calcular Top 3 MVPs (Usuários com maior pontuação total)
        const users = await prisma.user.findMany({
            include: {
                dailyLogs: {
                    select: { dayScore: true }
                },
                team: {
                    select: { name: true, color: true }
                }
            }
        })

        const rankedUsers = users.map(user => {
            const totalScore = user.dailyLogs.reduce((sum, log) => sum + log.dayScore, 0)
            return {
                username: user.username,
                teamName: user.team?.name || 'Sem Time',
                teamColor: user.team?.color || '#94a3b8',
                totalScore
            }
        })
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 3) // Top 3 Jogadores

        return NextResponse.json({
            teams: rankedTeams,
            mvps: rankedUsers
        })

    } catch (error) {
        console.error("Erro Leaderboard:", error)
        return NextResponse.json({ error: "Falha ao calcular ranking" }, { status: 500 })
    }
}
