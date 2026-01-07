'use server'
import { redis } from '@/lib/redis'
import { revalidatePath } from 'next/cache'

export async function saveProfileAction(formData: any) {
  try {
    if (!redis) {
      return { error: "Banco de dados não configurado no servidor." }
    }

    const { username, data } = formData

    if (!username) {
      return { error: "Usuário não identificado." }
    }

    const profileKey = `perfil:${username}`

    await redis.set(profileKey, JSON.stringify(data))

    revalidatePath('/dashboard')
    revalidatePath('/perfil')

    return { success: true }
  } catch (err) {
    return { error: "Falha na sincronização com o Redis." }
  }
}