export const storage = {
  async save(key: string, data: any) {
    if (typeof window === 'undefined') return

    // Salva localmente
    localStorage.setItem(key, JSON.stringify(data))
  },

  async get(key: string) {
    if (typeof window === 'undefined') return null

    // Fallback para LocalStorage
    const local = localStorage.getItem(key)
    try {
      return local ? JSON.parse(local) : null
    } catch (e) {
      return null
    }
  }
}