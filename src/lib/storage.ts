export const storage = {
  async save(key: string, data: any) {
    // Sempre salva no LocalStorage para ter cache offline/dev
    localStorage.setItem(key, JSON.stringify(data))

    // Se estiver em produção, manda para o Redis via API
    if (process.env.NODE_ENV === 'production') {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, data })
        })
      } catch (e) {
        console.error("Erro ao sincronizar com Redis", e)
      }
    }
  },

  async get(key: string) {
    // Se estiver em produção, tenta buscar do Redis primeiro
    if (process.env.NODE_ENV === 'production') {
      try {
        const res = await fetch(`/api/sync?key=${key}`)
        const serverData = await res.json()
        if (serverData) {
          localStorage.setItem(key, JSON.stringify(serverData))
          return serverData
        }
      } catch (e) {
        console.error("Erro ao buscar do Redis", e)
      }
    }

    // Fallback para LocalStorage (ou modo Dev)
    const local = localStorage.getItem(key)
    return local ? JSON.parse(local) : null
  }
}