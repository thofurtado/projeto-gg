import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, weight, height, waist, chest, bicepL, bicepR, waterMeta } = body

        if (!username) {
            return NextResponse.json({ error: 'Username obrigatório' }, { status: 400 })
        }

        // Upsert User (Cria ou Atualiza configs)
        const user = await prisma.user.upsert({
            where: { username },
            update: {
                waterGoal: waterMeta || 3000,
            },
            create: {
                username,
                waterGoal: waterMeta || 3000,
            }
        })

        // Cria Histórico Biométrico (BiometricLog)
        // Só cria se houver pelo menos um dado biométrico relevante
        if (weight || height || waist || chest || bicepL || bicepR) {
            await prisma.biometricLog.create({
                data: {
                    userId: user.id,
                    weight: weight ? Number(weight) : 0,
                    height: height ? Number(height) : 0,
                    waist: waist ? Number(waist) : null,
                    chest: chest ? Number(chest) : null,
                    bicepL: bicepL ? Number(bicepL) : null,
                    bicepR: bicepR ? Number(bicepR) : null,
                    date: new Date()
                }
            })
        }

        // Retorna o histórico atualizado para o front
        const history = await prisma.biometricLog.findMany({
            where: { userId: user.id },
            orderBy: { date: 'desc' },
            take: 5
        })

        return NextResponse.json({ success: true, user, history })
    } catch (error) {
        console.error("Erro no registro de usuário:", error)
        return NextResponse.json({ error: 'Erro ao salvar perfil' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const username = searchParams.get('username')

        if (!username) return NextResponse.json({ error: 'Username missing' }, { status: 400 })

        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                biometricLogs: {
                    orderBy: { date: 'desc' },
                    take: 10
                }
            }
        })

        if (!user) return NextResponse.json({ found: false }, { status: 404 })

        return NextResponse.json({
            found: true,
            user,
            history: user.biometricLogs
        })

    } catch (error) {
        return NextResponse.json({ error: 'Error fetching user' }, { status: 500 })
    }
}
