export const storage = {
  async save(key: string, data: any) {
    if (typeof window === 'undefined') return

    // Salva localmente primeiro
    localStorage.setItem(key, JSON.stringify(data))

    // Tenta sincronizar com o Redis (sempre que possível)
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data })
      })
    } catch (e) {
      console.error("Erro ao sincronizar com Redis:", e)
    }
  },

  async get(key: string) {
    if (typeof window === 'undefined') return null

    // Tenta buscar do Redis primeiro para garantir que guia anônima/celular funcione
    try {
      const res = await fetch(`/api/sync?key=${key}`)
      if (res.ok) {
        const serverData = await res.json()
        if (serverData !== null && serverData !== undefined) {
          localStorage.setItem(key, JSON.stringify(serverData))
          return serverData
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar do Redis, usando LocalStorage:", e)
    }

    // Fallback para LocalStorage
    const local = localStorage.getItem(key)
    try {
      return local ? JSON.parse(local) : null
    } catch (e) {
      return null
    }
  }
}