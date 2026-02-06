
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const availableUsers = await prisma.user.findMany({
            where: {
                role: 'MEMBER',
                teamId: null
            },
            select: {
                id: true,
                username: true
            }
        })
        return NextResponse.json(availableUsers)
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
    }
}
