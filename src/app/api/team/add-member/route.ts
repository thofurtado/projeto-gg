
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, targetUsername, teamId } = body // 'username' is the requester

        if (!username || !targetUsername) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
        }

        const requester = await prisma.user.findUnique({ where: { username } })
        if (!requester) return NextResponse.json({ error: 'Solicitante não encontrado' }, { status: 404 })

        const userRole = (requester as any).role

        if (userRole === 'MEMBER') {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const targetUser = await prisma.user.findUnique({ where: { username: targetUsername } })
        if (!targetUser) return NextResponse.json({ error: 'Usuário alvo não encontrado' }, { status: 404 })

        if (targetUser.teamId) {
            return NextResponse.json({ error: 'Usuário já está em uma equipe' }, { status: 409 })
        }

        let targetTeamId = null

        if (userRole === 'GUIDE') {
            // Guia só pode adicionar ao PRÓPRIO time
            // Verificar qual time ele lidera ou participa
            // Pelo schema, Team tem leaderId. E user pode ter teamId.
            // O ideal é buscar o time onde leaderId == requester.id
            const guideTeam = await prisma.team.findFirst({
                where: { leaderId: requester.id }
            })

            if (!guideTeam) {
                return NextResponse.json({ error: 'Você não lidera nenhuma equipe.' }, { status: 400 })
            }
            targetTeamId = guideTeam.id
        } else if (userRole === 'ADMIN') {
            // Admin pode adicionar em qualquer time, precisa vir no body 'teamId'
            if (!teamId) {
                // Se não fornecer, tenta adicionar ao time do proprio admin se tiver, senao erro
                const adminTeam = await prisma.team.findFirst({ where: { leaderId: requester.id } })
                if (adminTeam) targetTeamId = adminTeam.id
                else return NextResponse.json({ error: 'Admin deve especificar o teamId se não liderar um time' }, { status: 400 })
            } else {
                targetTeamId = teamId
            }
        }

        if (!targetTeamId) return NextResponse.json({ error: 'Time destino inválido' }, { status: 400 })

        // Adicionar usuário
        await prisma.user.update({
            where: { id: targetUser.id },
            data: {
                teamId: targetTeamId,
                role: 'MEMBER' // Ou manter o que estava? Geralmente quem entra é membro.
            }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error("Erro Add Member:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
