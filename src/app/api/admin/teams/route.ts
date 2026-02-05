
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const username = searchParams.get('username')

        if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

        const user = await prisma.user.findUnique({ where: { username } })

        // Verificar permissão ADMIN (usando cast any temporario para evitar erro de lint se types nao estiverem up)
        if (!user || (user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const teams = await prisma.team.findMany({
            include: {
                members: {
                    select: { id: true }
                },
                // leader: { select: { username: true } } // LeaderId é string direto, se tiver relation 'leader' no schema seria bom, mas nao adicionei relation explicita de 'leader' no Team ainda, so leaderId field.
                // Vou buscar o User lider manualmente ou adicionar relation se necessario.
                // O schema tem: leaderId String. User tem relations. 
                // NÃO tem relation One-to-One 'leader' em Team apontando pra User no schema atual (step 141).
                // Vou fazer fetch separado ou incluir se der. 
            }
        })

        // Enriquecer com nome do lider
        const teamsWithLeader = await Promise.all(teams.map(async (t) => {
            const leader = await prisma.user.findUnique({
                where: { id: t.leaderId },
                select: { username: true }
            })
            return {
                ...t,
                leaderName: leader?.username || 'N/A',
                memberCount: t.members.length
            }
        }))

        return NextResponse.json({ teams: teamsWithLeader })

    } catch (error: any) {
        console.error("Erro Admin Teams:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
