"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Dumbbell, LogIn, UserPlus, Eye, EyeOff, Loader2, Sun, Moon } from "lucide-react"
import { storage } from "@/lib/storage"
import { useTheme } from "@/components/theme-provider"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    const user = localStorage.getItem("user_gg")
    if (user) window.location.href = "/dashboard"
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    const lowerUser = username.toLowerCase().trim().replace(/\s+/g, '')

    if (lowerUser.length < 3) {
      setLoading(false)
      return toast.error("Usuário muito curto")
    }

    try {
      const storedUsers = await storage.get("gg_users") || []

      if (isLogin) {
        const user = storedUsers.find((u: any) => u.username === lowerUser && u.password === password)

        if (user) {
          localStorage.setItem("user_gg", lowerUser)
          toast.success("Acesso autorizado!")
          window.location.href = "/dashboard"
        } else {
          toast.error("Credenciais inválidas")
        }
      } else {
        if (password.length < 4) {
          setLoading(false)
          return toast.error("Senha deve ter ao menos 4 dígitos")
        }

        if (password !== confirmPassword) {
          setLoading(false)
          return toast.error("As senhas não coincidem")
        }

        if (storedUsers.find((u: any) => u.username === lowerUser)) {
          setLoading(false)
          return toast.error("Identidade já registrada")
        }

        const newUser = {
          username: lowerUser,
          password,
          createdAt: new Date().toISOString()
        }

        const updatedUsers = [...storedUsers, newUser]

        await storage.save("gg_users", updatedUsers)
        await storage.save(`perfil_${lowerUser}`, {
          username: lowerUser,
          config: { waterMeta: 3000 },
          ultimoRegistro: { weight: 0, height: 0, waist: 0, chest: 0, armL: 0, armR: 0 },
          historico: []
        })

        localStorage.setItem("user_gg", lowerUser)
        toast.success("Perfil forjado com sucesso!")
        window.location.href = "/dashboard"
      }
    } catch (err) {
      console.error(err)
      toast.error("Falha na conexão com o servidor")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white p-6 font-sans selection:bg-[#CCFF00]/30 transition-colors duration-300">

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full bg-white dark:bg-zinc-900 shadow-lg border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-[#CCFF00] dark:hover:text-[#CCFF00] transition-all"
      >
        {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 p-8 rounded-[40px] shadow-2xl backdrop-blur-sm transition-all duration-300">
        <div className="text-center mb-10">
          <div className="bg-[#CCFF00] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(204,255,0,0.4)]">
            <Dumbbell className="text-black" size={32} />
          </div>
          <h1 className="text-4xl font-black italic text-[#CCFF00] tracking-tighter uppercase leading-none drop-shadow-sm stroke-black">Projeto GG</h1>
          <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-black mt-3 uppercase tracking-[0.3em]">
            {isLogin ? "Acesso Membro" : "Novo Recruta"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-3">
          <div className="relative group">
            <input
              type="text"
              placeholder="NOME DE USUÁRIO"
              required
              autoComplete="username"
              className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-[#CCFF00]/50 font-black transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-800 text-sm italic"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="SUA SENHA"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-[#CCFF00]/50 font-black transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-800 text-sm italic pr-14"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-700 hover:text-[#CCFF00] transition-colors"
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
                autoComplete="new-password"
                className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-[#CCFF00]/50 font-black transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-800 text-sm italic pr-14"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#CCFF00] hover:bg-[#b3e600] text-black font-black py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-lg shadow-[#CCFF00]/20 mt-6 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? <><LogIn size={18} /> Entrar no Sistema</> : <><UserPlus size={18} /> Iniciar Jornada</>)}
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
          className="w-full mt-8 text-slate-400 dark:text-zinc-700 text-[9px] font-black uppercase tracking-[0.2em] hover:text-[#CCFF00] transition-colors"
        >
          {isLogin ? "Ainda não é um membro GG? Cadastre-se" : "Já possui registro? Autenticar"}
        </button>
      </div>

      <p className="mt-8 text-[8px] font-black text-slate-400 dark:text-zinc-900 uppercase tracking-[0.5em]">Central de Comando // v1.0.3</p>
    </div>
  )
}