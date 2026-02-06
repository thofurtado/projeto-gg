
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username } = body

        if (!username) {
            return NextResponse.json({ valid: false }, { status: 400 })
        }

        // Busca rápida apenas para validar existência
        const user = await prisma.user.findUnique({
            where: { username },
            select: { role: true, teamId: true } // Otimizado
        })

        if (!user) {
            return NextResponse.json({ valid: false }, { status: 404 })
        }

        return NextResponse.json({ valid: true, role: user.role, teamId: user.teamId })

    } catch (error) {
        console.error("User Check Error:", error)
        // Se der erro servidor, retornamos 500, o frontend deve DECIDIR se bloqueia ou deixa passar (modo offline)
        // Mas a validade da conta tecnicamente é desconhecida.
        return NextResponse.json({ valid: false, error: 'Server Error' }, { status: 500 })
    }
}
