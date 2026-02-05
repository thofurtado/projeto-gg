
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, teamName } = body

        if (!username || !teamName) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

        if (user.teamId) {
            return NextResponse.json({ error: 'Usuário já está em uma equipe' }, { status: 409 })
        }

        // Permissão: Apenas GUIDE ou ADMIN pode criar time
        if ((user as any).role === 'MEMBER') {
            return NextResponse.json({ error: 'Apenas Guias ou Admins podem criar equipes.' }, { status: 403 })
        }

        // Se for GUIDE, verificar se já lidera outro time (embora teamId já bloqueie participação, 
        // leaderId é o vinculo de propriedade).
        // A logica "user.teamId" ja cobre se ele esta em um time. 
        // Se ele sair de um time, ele pode criar outro sendo GUIDE.

        // Criar Time
        const newTeam = await prisma.team.create({
            data: {
                name: teamName,
                leaderId: user.id,
                members: {
                    connect: { id: user.id }
                }
            }
        })

        // Não precisa atualizar Role para LEADER pois agora 'GUIDE' é a role persistente.
        // O conceito de "Líder" é quem está no campo leaderId do Team.



        return NextResponse.json({ success: true, team: newTeam })

    } catch (error: any) {
        console.error("Erro Create Team:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
