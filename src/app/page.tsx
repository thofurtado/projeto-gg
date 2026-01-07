"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Dumbbell, LogIn, UserPlus, Eye, EyeOff } from "lucide-react"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()

    const storedUsers = JSON.parse(localStorage.getItem("gg_users") || "[]")
    const lowerUser = username.toLowerCase().trim()

    if (isLogin) {
      const user = storedUsers.find((u: any) => u.username === lowerUser && u.password === password)

      if (user) {
        localStorage.setItem("user_gg", lowerUser)
        toast.success("Bem-vindo de volta!")
        window.location.href = "/perfil"
      } else {
        toast.error("Usuário ou senha incorretos")
      }
    } else {
      if (password !== confirmPassword) {
        return toast.error("As senhas não coincidem")
      }

      if (storedUsers.find((u: any) => u.username === lowerUser)) {
        return toast.error("Este usuário já existe")
      }

      const newUser = {
        username: lowerUser,
        password,
        createdAt: new Date().toISOString()
      }

      storedUsers.push(newUser)
      localStorage.setItem("gg_users", JSON.stringify(storedUsers))
      localStorage.setItem("user_gg", lowerUser)

      toast.success("Conta criada com sucesso!")
      window.location.href = "/perfil"
    }
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 font-sans selection:bg-green-500/30">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-[40px] shadow-2xl backdrop-blur-sm">
        <div className="text-center mb-10">
          <div className="bg-green-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Dumbbell className="text-black" size={32} />
          </div>
          <h1 className="text-4xl font-black italic text-green-500 tracking-tighter uppercase">Projeto GG</h1>
          <p className="text-zinc-500 text-[10px] font-black mt-2 uppercase tracking-[0.3em]">
            {isLogin ? "Acesso Membro" : "Novo Recruta"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-3">
          <div className="relative group">
            <input
              type="text"
              placeholder="NOME DE USUÁRIO"
              required
              className="w-full bg-black/40 border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-green-500/50 font-black transition-all text-white placeholder:text-zinc-700 text-sm italic"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="SUA SENHA"
              required
              className="w-full bg-black/40 border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-green-500/50 font-black transition-all text-white placeholder:text-zinc-700 text-sm italic pr-14"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {!isLogin && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="CONFIRME A SENHA"
                required
                className="w-full bg-black/40 border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-green-500/50 font-black transition-all text-white placeholder:text-zinc-700 text-sm italic pr-14"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-lg shadow-green-500/10 mt-6"
          >
            {isLogin ? <><LogIn size={18} /> Entrar no Sistema</> : <><UserPlus size={18} /> Iniciar Jornada</>}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setUsername("");
            setPassword("");
            setConfirmPassword("");
            setShowPassword(false);
          }}
          className="w-full mt-8 text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em] hover:text-green-500 transition-colors"
        >
          {isLogin ? "Ainda não é um membro GG? Cadastre-se" : "Já possui registro? Autenticar"}
        </button>
      </div>

      <p className="mt-8 text-[8px] font-black text-zinc-800 uppercase tracking-[0.5em]">Central de Comando // v1.0.2</p>
    </div>
  )
}