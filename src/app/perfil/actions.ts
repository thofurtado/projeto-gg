'use server'
import redis from '@/lib/redis'
import { revalidatePath } from 'next/cache'

export async function saveProfileAction(formData: any) {
  const username = "admin" // Por enquanto fixo, depois pegaremos da sessão
  
  // Criamos uma chave única para o perfil do usuário
  const key = `user:${username}:profile`
  
  await redis.set(key, JSON.stringify(formData))
  
  revalidatePath('/perfil')
  return { success: true }
}