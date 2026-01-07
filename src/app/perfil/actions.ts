'use server'
import { redis } from '@/lib/redis'
import { revalidatePath } from 'next/cache'

export async function saveProfileAction(formData: any) {
    try {
        if (!redis) {
            return { error: "Banco de dados não configurado." }
        }

        const { username, data } = formData
        const profileKey = `perfil:${username}`

        await redis.set(profileKey, JSON.stringify(data))
        
        revalidatePath('/dashboard')
        return { success: true }
    } catch (err) {
        return { error: "Erro ao salvar no banco de dados." }
    }
}