'use server'
import redis from '@/lib/redis'

export async function authAction(formData: any, mode: 'login' | 'signup') {
    try {
        const { username, password } = formData
        const userKey = `user:${username.toLowerCase().trim()}:auth`

        const data = await redis.get(userKey)

        if (mode === 'signup') {
            if (data) return { error: "Usuário já existe!" }

            const newUser = {
                username: username.toLowerCase().trim(),
                password
            }
            await redis.set(userKey, JSON.stringify(newUser))
            return { success: true, username: newUser.username }
        } else {
            if (!data) return { error: "Usuário não encontrado!" }

            const user = JSON.parse(data as string)
            if (user.password !== password) return { error: "Senha incorreta!" }

            return { success: true, username: user.username }
        }
    } catch (err) {
        return { error: "Erro na conexão com o banco." }
    }
}