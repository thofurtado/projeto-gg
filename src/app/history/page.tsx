
"use client"
import { useState, useEffect } from "react"
import { Users, Home, User, History as HistoryIcon, Sun, Moon, Calendar, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "@/components/theme-provider"

export default function HistoryPage() {
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [history, setHistory] = useState<any[]>([])
    const [totalScore, setTotalScore] = useState(0)
    const { theme, toggleTheme } = useTheme()

    useEffect(() => {
        setMounted(true)
        const init = async () => {
            const user = localStorage.getItem("user_gg")
            if (!user) return window.location.href = "/"

            try {
                const res = await fetch(`/api/user/history?username=${user}`)
                if (res.ok) {
                    const data = await res.json()
                    setHistory(data.history)
                    setTotalScore(data.totalScore)
                }
            } catch (e) {
                toast.error("Erro ao carregar histórico")
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white font-sans pb-32">
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-3xl border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <HistoryIcon className="text-[#CCFF00]" size={24} />
                    <span className="text-xs font-black uppercase tracking-widest leading-none">Minha Jornada</span>
                </div>
                <button onClick={toggleTheme} className="p-2 bg-slate-100 dark:bg-zinc-900 rounded-xl">
                    {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
            </header>

            <main className="max-w-[600px] mx-auto pt-24 px-6 space-y-8">

                {/* Total Score Card */}
                <div className="bg-[#CCFF00] p-8 rounded-[2.5rem] shadow-xl shadow-[#CCFF00]/20 text-center space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <span className="relative text-[10px] font-black uppercase tracking-[0.3em] text-black/60">Pontuação Total Acumulada</span>
                    <h1 className="relative text-6xl font-black italic text-black tracking-tighter leading-none">{totalScore}</h1>
                    <span className="relative text-xs font-bold text-black uppercase tracking-widest">Pontos desde o início</span>
                </div>

                {/* History List */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <TrendingUp size={16} className="text-slate-400" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Últimos 30 Dias</h2>
                    </div>

                    {history.length === 0 && !loading ? (
                        <div className="text-center py-10 text-slate-400 text-xs uppercase font-bold">Nenhum registro encontrado.</div>
                    ) : (
                        history.map((log) => (
                            <div key={log.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-3xl flex items-center justify-between hover:scale-[1.01] transition-transform">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-500 border border-slate-200 dark:border-white/5">
                                        <span className="text-[10px] font-black uppercase">{new Date(log.date).toLocaleString('default', { month: 'short' }).replace('.', '')}</span>
                                        <span className="text-lg font-black leading-none text-slate-900 dark:text-white">{new Date(log.date).getUTCDate()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                                            {new Date(log.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                                        </span>
                                        <div className="flex gap-2 mt-1">
                                            {/* Mini Indicators */}
                                            {log.dayScore > 0 && <span className="text-[9px] px-1.5 py-0.5 bg-[#CCFF00]/20 text-[#CCFF00] rounded uppercase font-bold">Pontuou</span>}
                                            {log.waterMl >= 3000 && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded uppercase font-bold">Água</span>}
                                            {log.calorieAbuse && <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded uppercase font-bold">Jacou</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-2xl font-black italic tabular-nums leading-none text-[#CCFF00]">{log.dayScore}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">pts</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* NAV FOOTER */}
            <footer className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pointer-events-none">
                <div className="max-w-[500px] mx-auto pointer-events-auto">
                    <div className="bg-white/95 dark:bg-[#1a1c21]/95 border border-slate-200 dark:border-white/10 p-2.5 rounded-[3rem] flex items-center justify-between shadow-2xl backdrop-blur-3xl ring-1 ring-black/5 dark:ring-white/5">
                        <button onClick={() => window.location.href = "/dashboard"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-all group">
                            <Home size={24} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
                        </button>

                        <button onClick={() => window.location.href = "/team"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-all group">
                            <Users size={24} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Equipe</span>
                        </button>

                        {/* Active History */}
                        <button className="flex-1 flex flex-col items-center gap-2 py-5 bg-[#CCFF00] text-black rounded-[2.5rem] shadow-xl transition-all">
                            <HistoryIcon size={24} strokeWidth={2.5} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Histórico</span>
                        </button>

                        <button onClick={() => window.location.href = "/perfil"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-all group">
                            <User size={24} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Perfil</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    )
}
