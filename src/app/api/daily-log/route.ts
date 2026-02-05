import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Tabela Oficial: 1º=25, 2º=20, 3º=13, 4º=9, 5º=7, 6º=6, 7º=10
const TRAINING_GAINS = [25, 20, 13, 9, 7, 6, 10]

// Função auxiliar para garantir datas sempre em UTC Midnight
function normalizeDate(dateStr: string) {
    if (!dateStr) return new Date();
    const dateObj = new Date(dateStr)
    // Força a data para UTC mantendo o dia selecionado pelo usuário
    const year = dateObj.getUTCFullYear()
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getUTCDate()).padStart(2, '0')
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`)
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, date, metrics, sessionActivity } = body

        if (!username || !date) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

        // 1. Provisionamento de Usuário
        let user = await prisma.user.findUnique({ where: { username } })
        if (!user) {
            user = await prisma.user.create({
                data: { username }
            })
        }

        const logDateObj = normalizeDate(date)

        // --- LÓGICA DE TREINO CORRIGIDA (CONTAGEM ABSOLUTA) ---
        let pointsFromTraining = 0

        if (sessionActivity) {
            // A. Definir o intervalo da semana (Domingo a Sábado) em UTC
            const weekStart = new Date(logDateObj)
            const dayOfWeek = weekStart.getUTCDay() // 0 (Domingo) a 6 (Sábado)
            weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek)
            weekStart.setUTCHours(0, 0, 0, 0)

            const weekEnd = new Date(weekStart)
            weekEnd.setUTCDate(weekEnd.getUTCDate() + 7) // Próximo Domingo (exclusive)

            // B. Buscar TODOS os logs da semana (SEM apagar nada antes)
            const weekLogs = await prisma.workoutLog.findMany({
                where: {
                    userId: user.id,
                    date: {
                        gte: weekStart,
                        lt: weekEnd
                    }
                },
                select: { date: true }
            })

            // C. Contar dias ÚNICOS na semana
            // Transformamos em string YYYY-MM-DD para evitar duplicidade de horas
            const uniqueDaysSet = new Set(weekLogs.map(log => log.date.toISOString().split('T')[0]))

            // TRUQUE DO MESTRE: Adicionamos o dia de HOJE na lista na memória.
            // Isso garante que, mesmo que o banco esteja vazio hoje (ou vamos sobrescrever),
            // a contagem de hoje será considerada.
            uniqueDaysSet.add(logDateObj.toISOString().split('T')[0])

            const weeklyCount = uniqueDaysSet.size

            // D. Calcular Pontos
            // Se weeklyCount é 1 (só hoje), pegamos index 0. 
            // Se weeklyCount é 4 (3 anteriores + hoje), pegamos index 3.
            // Limitamos ao tamanho do array para não quebrar.
            const index = Math.max(0, Math.min(weeklyCount - 1, TRAINING_GAINS.length - 1))
            pointsFromTraining = TRAINING_GAINS[index]

            console.log(`[DEBUG] Data: ${logDateObj.toISOString().split('T')[0]} | Contagem Semanal: ${weeklyCount} | Pontos: ${pointsFromTraining}`)

            // E. Agora sim, limpamos qualquer registro ANTERIOR deste mesmo dia para evitar duplicata
            const dayStart = new Date(logDateObj)
            const dayEnd = new Date(logDateObj)
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

            await prisma.workoutLog.deleteMany({
                where: {
                    userId: user.id,
                    date: { gte: dayStart, lt: dayEnd }
                }
            })

            // F. Salvar o novo treino com a pontuação calculada
            await prisma.workoutLog.create({
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

        } else {
            // Modo apenas atualização de métricas (água/sono), mantém os pontos de treino existentes
            const existing = await prisma.workoutLog.findFirst({
                where: {
                    userId: user.id,
                    date: logDateObj // Usando logDateObj normalizado
                }
            })
            pointsFromTraining = existing?.pointsEarned || 0
        }

        // --- CÁLCULO DO PLACAR DO DIA (MÉTRICAS + TREINO) ---
        let scoringPoints = 0
        const waterVal = metrics?.waterMl || 0
        const sleepVal = metrics?.sleepHours || 0

        // Regra Água
        if (waterVal >= (user.waterGoal || 3000)) scoringPoints += 15

        // Regra Sono
        if (sleepVal > 0) {
            if (sleepVal < 5) scoringPoints -= 15
            else if (sleepVal < 7) scoringPoints += 5
            else if (sleepVal < 8) scoringPoints += 9 // 7h a 7h59 = 17 pontos totais (exemplo original dizia 17, aqui soma +9 ao base? Ajuste conforme sua regra exata de sono)
            else scoringPoints += 15 // 8h+ = 20 pontos totais (se considerar base)
        }

        // Regra Alimentação
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
            where: { userId_date: { userId: user.id, date: logDateObj } },
            update: updateData,
            create: {
                userId: user.id,
                date: logDateObj,
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

        const log = await prisma.workoutLog.findUnique({
            where: { id: workoutLogId }
        })

        if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

        await prisma.workoutLog.delete({
            where: { id: workoutLogId }
        })

        // Decrementa pontuação do dia ao remover o treino
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