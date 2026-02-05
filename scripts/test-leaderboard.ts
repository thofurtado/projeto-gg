
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Testing Leaderboard Logic...")

    // 1. Fetch Teams
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

    console.log(`Found ${teams.length} teams.`)

    const rankedTeams = teams.map(team => {
        const totalScore = team.members.reduce((acc, member) => {
            const memberScore = member.dailyLogs.reduce((sum, log) => sum + log.dayScore, 0)
            return acc + memberScore
        }, 0)

        return {
            name: team.name,
            score: totalScore
        }
    })
        .sort((a, b) => b.score - a.score)

    console.log("Ranked Teams:", rankedTeams)

    // 2. MVPs
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
            totalScore
        }
    })
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 3)

    console.log("Top 3 MVPs:", rankedUsers)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
