import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TRAINING_GAINS = [25, 20, 13, 9, 7, 6, 10]

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
    const diff = d.getUTCDate() - day
    const sunday = new Date(d)
    sunday.setUTCDate(diff)
    sunday.setUTCHours(0, 0, 0, 0)
    return sunday
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

        // --- LÓGICA DE TREINO REESCRITA (CONTAGEM ABSOLUTA) ---
        let pointsFromTraining = 0
        if (sessionActivity) {
            // 1. Definição Robusta da Semana (Domingo 00:00 UTC - Próximo Domingo 00:00 UTC)
            const logDateObj = normalizeDate(date)

            const weekStart = new Date(logDateObj)
            const dayOfWeek = weekStart.getUTCDay()
            weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek)
            weekStart.setUTCHours(0, 0, 0, 0)

            const weekEnd = new Date(weekStart)
            weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

            // 2. Busca de Logs (Sem Deletar Antes) para garantir contagem correta da HISTÓRIA
            const weekLogs = await prisma.workoutLog.findMany({
                where: {
                    userId: user.id,
                    date: { gte: weekStart, lt: weekEnd }
                },
                select: { date: true }
            })

            // 3. Cálculo da Frequência (Na Memória)
            // Cria Set com datas existentes + DATA ATUAL (Crucial: garante que 'hoje' conte como +1)
            const uniqueDays = new Set(weekLogs.map(log => log.date.toISOString().split('T')[0]))
            uniqueDays.add(logDateObj.toISOString().split('T')[0])

            const weeklyCount = uniqueDays.size

            // 4. Determinação dos Pontos
            // Index 0 -> 1º dia (size 1)
            // Index 3 -> 4º dia (size 4)
            const index = Math.max(0, Math.min(weeklyCount - 1, TRAINING_GAINS.length - 1))
            pointsFromTraining = TRAINING_GAINS[index]

            console.log(`[DEBUG_SCORE_V2] Date:${logDateObj.toISOString()} | WeekCount:${weeklyCount} | Index:${index} | Points:${pointsFromTraining}`)

            // 5. Persistência (Delete anterior do dia + Create novo com pontos calculados)
            const dayStart = new Date(logDateObj)
            const dayEnd = new Date(logDateObj)
            dayEnd.setDate(dayEnd.getDate() + 1)

            // Upsert Manual via Transação
            await prisma.$transaction([
                prisma.workoutLog.deleteMany({
                    where: {
                        userId: user.id,
                        date: { gte: dayStart, lt: dayEnd }
                    }
                }),
                prisma.workoutLog.create({
                    data: {
                        userId: user.id,
                        date: logDateObj,
                        modalidade: sessionActivity.type,
                        exercise: 'SESSÃO_DIÁRIA',
                        performed: 1,
                        unit: 'sessão',
                        comment: sessionActivity.comment,
                        pointsEarned: pointsFromTraining
                    }
                })
            ])
        } else {
            // Modo leitura/update de outras métricas sem alterar treino
            const existing = await prisma.workoutLog.findFirst({
                where: { userId: user.id, date: normalizeDate(date) }
            })
            pointsFromTraining = existing?.pointsEarned || 0
        }

        // --- CÁLCULO DE PLACAR ---
        let scoringPoints = 0
        const waterVal = metrics?.waterMl || 0
        const sleepVal = metrics?.sleepHours || 0

        if (waterVal >= (user.waterGoal || 3000)) scoringPoints += 15

        if (sleepVal > 0) {
            if (sleepVal < 5) scoringPoints -= 15
            else if (sleepVal < 7) scoringPoints += 5
            else if (sleepVal < 8) scoringPoints += 9
            else scoringPoints += 15 // Covers 8 and above correctly
        }

        if (metrics?.ateFruits) scoringPoints += 5
        if (metrics?.ateVeggies) scoringPoints += 5
        if (metrics?.ateProtein) scoringPoints += 5
        if (metrics?.calorieAbuse) scoringPoints -= 10

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

export async function DELETE(req: Request) {
    try {
        const body = await req.json()
        const { workoutLogId } = body

        if (!workoutLogId) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        // 1. Get Log Info before deleting
        const log = await prisma.workoutLog.findUnique({
            where: { id: workoutLogId }
        })

        if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

        // 2. Delete Log
        await prisma.workoutLog.delete({
            where: { id: workoutLogId }
        })

        // 3. Recalculate Day Score (Decrement is safer than full recalc here to avoid race conditions with other metrics)
        const updatedDaily = await prisma.dailyLog.update({
            where: {
                userId_date: { userId: log.userId, date: log.date }
            },
            data: {
                dayScore: {
                    decrement: log.pointsEarned
                }
            }
        })

        return NextResponse.json({ success: true, dayScore: updatedDaily.dayScore })

    } catch (error: any) {
        console.error("Erro DELETE DailyLog:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
