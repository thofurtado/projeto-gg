import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TRAINING_GAINS = [25, 20, 10, 7, 5, 4, 9]

function normalizeDate(dateStr: string) {
    if (!dateStr) return new Date();
    // UTC Midnight strict parsing
    const dateObj = new Date(dateStr)
    const year = dateObj.getUTCFullYear()
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getUTCDate()).padStart(2, '0')
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`)
}

function getWeekStart(date: Date) {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setUTCDate(diff)
    monday.setUTCHours(0, 0, 0, 0)
    return monday
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, date, metrics, sessionActivity } = body

        if (!username || !date) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

        // 1. Provisionamento de Usuário (Garante que nunca falhe por falta de user)
        let user = await prisma.user.findUnique({ where: { username } })
        if (!user) {
            user = await prisma.user.create({
                data: { username }
            })
        }

        const logDate = normalizeDate(date)

        // --- LÓGICA DE TREINO ---
        let pointsFromTraining = 0
        if (sessionActivity) {
            const weekStart = getWeekStart(logDate)
            const weekLogs = await prisma.workoutLog.findMany({
                where: {
                    userId: user.id,
                    date: { gte: weekStart, lt: logDate }
                },
                distinct: ['date']
            })

            // Remove duplicatas do dia atual antes de contar/inserir
            await prisma.workoutLog.deleteMany({
                where: { userId: user.id, date: logDate }
            })

            const trainingCount = weekLogs.length
            pointsFromTraining = TRAINING_GAINS[trainingCount] || 5

            await prisma.workoutLog.create({
                data: {
                    userId: user.id,
                    date: logDate,
                    modalidade: sessionActivity.type,
                    exercise: 'SESSÃO_DIÁRIA',
                    performed: 1,
                    unit: 'sessão',
                    comment: sessionActivity.comment,
                    pointsEarned: pointsFromTraining
                }
            })
        } else {
            const existing = await prisma.workoutLog.findFirst({
                where: { userId: user.id, date: logDate }
            })
            pointsFromTraining = existing?.pointsEarned || 0
        }

        // --- CÁLCULO DE PLACAR ---
        let scoringPoints = 0
        const waterVal = metrics?.waterMl || 0
        const sleepVal = metrics?.sleepHours || 0

        if (waterVal >= (user.waterGoal || 3000)) scoringPoints += 15

        if (sleepVal > 0) {
            if (sleepVal < 5) scoringPoints -= 10
            else if (sleepVal >= 5 && sleepVal <= 8) scoringPoints += 15
        }

        if (metrics?.ateFruits) scoringPoints += 5
        if (metrics?.ateVeggies) scoringPoints += 5
        if (metrics?.ateProtein) scoringPoints += 5
        if (metrics?.calorieAbuse) scoringPoints -= 20

        const totalDayScore = pointsFromTraining + scoringPoints

        // --- UPSERT NO DIÁRIO ---
        const updateData: any = {
            usedApp: true,
            dayScore: totalDayScore
        }
        if (metrics?.waterMl !== undefined) updateData.waterMl = metrics.waterMl
        if (metrics?.sleepHours !== undefined) updateData.sleepHours = metrics.sleepHours
        if (metrics?.ateFruits !== undefined) updateData.ateFruits = metrics.ateFruits
        if (metrics?.ateVeggies !== undefined) updateData.ateVeggies = metrics.ateVeggies
        if (metrics?.ateProtein !== undefined) updateData.ateProtein = metrics.ateProtein
        if (metrics?.calorieAbuse !== undefined) updateData.calorieAbuse = metrics.calorieAbuse

        await prisma.dailyLog.upsert({
            where: { userId_date: { userId: user.id, date: logDate } },
            update: updateData,
            create: {
                userId: user.id,
                date: logDate,
                waterMl: metrics?.waterMl || 0,
                sleepHours: metrics?.sleepHours || 0,
                ateFruits: metrics?.ateFruits || false,
                ateVeggies: metrics?.ateVeggies || false,
                ateProtein: metrics?.ateProtein || false,
                calorieAbuse: metrics?.calorieAbuse || false,
                usedApp: true,
                dayScore: totalDayScore
            }
        })

        return NextResponse.json({ success: true, dayScore: totalDayScore, trainingPoints: pointsFromTraining })

    } catch (error: any) {
        console.error("Erro DailyLog:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const username = searchParams.get('username')
        const date = searchParams.get('date')

        if (!username || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

        const logDate = normalizeDate(date)

        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                dailyLogs: { where: { date: logDate } },
                workoutLogs: { where: { date: logDate } }
            }
        })

        if (!user) {
            // Return zeros instead of 404 to allow clean state init
            return NextResponse.json({
                dailyLog: { waterMl: 0, dayScore: 0 },
                workoutLogs: []
            })
        }

        return NextResponse.json({
            dailyLog: user.dailyLogs[0] || { waterMl: 0, dayScore: 0 },
            workoutLogs: user.workoutLogs || []
        })

    } catch (error) {
        return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 })
    }
}
