
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { username } = await req.json()

        if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

        await prisma.user.update({
            where: { username },
            data: { teamId: null }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }
}
