import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, password } = body

        if (!username || !password) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
        }

        if (password.length < 4) {
            return NextResponse.json({ error: 'Senha muito curta (min 4)' }, { status: 400 })
        }

        const existingUser = await prisma.user.findUnique({
            where: { username }
        })

        if (existingUser) {
            return NextResponse.json({ error: 'Usuário já existe' }, { status: 409 })
        }

        const hashedPassword = await hash(password, 10)

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: 'MEMBER',
                // Default values are already handled by Prisma schema (waterGoal: 3000, etc)
            }
        })

        return NextResponse.json({
            success: true,
            user: {
                username: user.username,
                role: user.role
            }
        })

    } catch (error) {
        console.error("Register Error:", error)
        return NextResponse.json({ error: 'Erro ao registrar usuário' }, { status: 500 })
    }
}
