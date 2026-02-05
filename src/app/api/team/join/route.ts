
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, teamCode } = body // teamCode pode ser o ID ou um código específico se implementado

        if (!username || !teamCode) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

        if (user.teamId) {
            return NextResponse.json({ error: 'Você já participa de uma equipe. Saia antes de entrar em outra.' }, { status: 409 })
        }

        // Tenta achar o time pelo ID (ou Name, code, etc. Aqui assumimos ID para simplicidade inicial ou Name)
        // O user disse "usando ID ou código". Vamos tentar buscar por ID primeiro.
        let team = await prisma.team.findUnique({ where: { id: teamCode } })

        // Se não achou por ID, tenta por Nome (case insensitive seria ideal, mas por enquanto exato)
        if (!team) {
            // Prisma findFirst para name
            team = await prisma.team.findFirst({ where: { name: teamCode } })
        }

        if (!team) {
            return NextResponse.json({ error: 'Equipe não encontrada' }, { status: 404 })
        }

        // Adicionar usuário ao time
        await prisma.user.update({
            where: { id: user.id },
            data: {
                teamId: team.id,
                role: 'MEMBER'
            }
        })

        return NextResponse.json({ success: true, teamName: team.name })

    } catch (error: any) {
        console.error("Erro Join Team:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
