"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === "admin" && password === "admin123") {
      localStorage.setItem("user_gg", "admin")
      router.push("/perfil")
    } else {
      setError("Acesso negado. Verifique usuário e senha.")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black tracking-tighter italic text-green-500">GG</h1>
          <p className="text-zinc-400 mt-2 font-medium">GRANDES GOSTOSOS • 120 DIAS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="text"
            placeholder="Usuário"
            className="w-full bg-zinc-800 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-500 transition"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full bg-zinc-800 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-500 transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-2xl transition-transform active:scale-95">
            ENTRAR NO PROJETO
          </button>
        </form>
      </div>
    </div>
  )
}