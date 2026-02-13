
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, password } = body

        if (!username || !password) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { username }
        })

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        // 1. Tentar comparar Hash (Padrão Seguro)
        let isValid = false
        if (user.password) {
            // Tenta validar como hash
            isValid = await compare(password, user.password)

            // 2. Fallback: Se falhar obvio, verificar se é texto puro (caso o seed antigo tenha sobrado)
            // Isso é um failsafe de desenvolvimento.
            if (!isValid && user.password === password) {
                isValid = true
            }
        }

        if (!isValid) {
            return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
        }

        // Login Sucesso
        return NextResponse.json({
            success: true,
            user: {
                username: user.username,
                role: user.role,
                teamId: user.teamId,
                profileCompleted: user.profileCompleted || false
            }
        })

    } catch (error: any) {
        console.error("Login Error:", error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
