import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, weight, height, waist, chest, bicepL, bicepR, waterMeta } = body

        if (!username) {
            return NextResponse.json({ error: 'Username é obrigatório' }, { status: 400 })
        }

        let user = await prisma.user.findUnique({ where: { username } })

        // 1. Provisionamento de Usuário (Criação automática se não existir)
        // 1. Provisionamento de Usuário (Criação automática se não existir)
        if (!user) {
            console.log(`Criando usuário ${username}...`)
            // Correção: User table não tem weight/height
            user = await prisma.user.create({
                data: {
                    username,
                    waterGoal: waterMeta ? Number(waterMeta) : 3000
                }
            })
        } else if (waterMeta) {
            // Atualiza meta se user já existir
            await prisma.user.update({
                where: { id: user.id },
                data: { waterGoal: Number(waterMeta) }
            })
        }

        // 2. Criar registro no Histórico Biométrico (BiometricLog)
        const log = await prisma.biometricLog.create({
            data: {
                userId: user.id,
                weight: weight ? Number(weight) : 0,
                height: height ? Number(height) : 0,
                waist: waist ? Number(waist) : null, // Nullable fields
                chest: chest ? Number(chest) : null,
                bicepL: bicepL ? Number(bicepL) : null,
                bicepR: bicepR ? Number(bicepR) : null,
                date: new Date()
            }
        })

        // 3. Retornar histórico atualizado
        const history = await prisma.biometricLog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 5
        })

        return NextResponse.json({ success: true, log, history })

    } catch (error: any) {
        console.error("CRITICAL API ERROR:", error)
        return new NextResponse(
            JSON.stringify({
                error: 'Falha Crítica no Servidor',
                details: error.message || String(error)
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
}
