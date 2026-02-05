
"use client"
import { useState, useEffect } from "react"
import { Users, Plus, ArrowRight, Trophy, Crown, Trash2, Loader2, Home, Activity, User, History as HistoryIcon, Sun, Moon, Settings, Shield } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "@/components/theme-provider"

export default function TeamPage() {
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [viewState, setViewState] = useState<'LOADING' | 'NO_TEAM' | 'TEAM_DASH' | 'ADMIN_DASH'>('LOADING')

    // Data
    const [teamData, setTeamData] = useState<any>(null)
    const [adminTeams, setAdminTeams] = useState<any[]>([])
    const [userRole, setUserRole] = useState("MEMBER")

    // Inputs
    const [inputName, setInputName] = useState("") // Team Name creation
    const [inputMember, setInputMember] = useState("") // Add Member
    const [inputCode, setInputCode] = useState("") // Join Code

    const { theme, toggleTheme } = useTheme()

    const fetchAdminData = async (username: string) => {
        try {
            const res = await fetch(`/api/admin/teams?username=${username}`)
            if (res.ok) {
                const data = await res.json()
                setAdminTeams(data.teams)
                setViewState('ADMIN_DASH')
            }
        } catch (e) { toast.error("Erro admin") }
    }

    const reloadData = async () => {
        setLoading(true)
        const user = localStorage.getItem("user_gg")
        if (!user) return

        try {
            const res = await fetch(`/api/team/members?username=${user}`)
            if (res.ok) {
                const data = await res.json()
                const role = data.role || 'MEMBER'
                setUserRole(role)

                if (role === 'ADMIN') {
                    // Admin logic: pode ter time proprio TAMBEM, mas a view principal pede "Lista de todas as equipes"
                    await fetchAdminData(user)
                } else if (data.hasTeam) {
                    setTeamData(data)
                    setViewState('TEAM_DASH')
                } else {
                    setViewState('NO_TEAM')
                }
            }
        } catch (e) {
            toast.error("Erro ao carregar")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setMounted(true)
        if (typeof window !== 'undefined') {
            const user = localStorage.getItem("user_gg")
            if (!user) window.location.href = "/"
            else reloadData()
        }
    }, [])

    const handleCreate = async () => {
        if (!inputName) return toast.error("Digite um nome")
        const user = localStorage.getItem("user_gg")

        try {
            const res = await fetch('/api/team/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, teamName: inputName })
            })
            if (res.ok) {
                toast.success("Equipe criada!")
                reloadData()
            } else {
                const err = await res.json()
                toast.error(err.error || "Erro ao criar")
            }
        } catch (e) { toast.error("Erro conexao") }
    }

    const handleAddMember = async () => {
        if (!inputMember) return toast.error("Digite o username")
        const user = localStorage.getItem("user_gg")

        try {
            const res = await fetch('/api/team/add-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, targetUsername: inputMember })
            })
            if (res.ok) {
                toast.success("Membro adicionado!")
                setInputMember("")
                reloadData()
            } else {
                const err = await res.json()
                toast.error(err.error || "Erro ao adicionar")
            }
        } catch (e) { toast.error("Erro conexao") }
    }

    const handleJoin = async () => {
        if (!inputCode) return toast.error("Digite o nome ou ID da equipe")
        const user = localStorage.getItem("user_gg")

        try {
            const res = await fetch('/api/team/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, teamCode: inputCode })
            })

            if (res.ok) {
                toast.success("Bem-vindo à equipe!")
                reloadData()
            } else {
                const err = await res.json()
                toast.error(err.error || "Erro ao entrar")
            }
        } catch (e) { toast.error("Erro de conexão") }
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white font-sans pb-32">
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-3xl border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Users className="text-[#CCFF00]" size={24} />
                    <span className="text-xs font-black uppercase tracking-widest leading-none">
                        {userRole === 'ADMIN' ? 'Admin Panel' : 'Minha Equipe'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {userRole === 'GUIDE' && <span className="text-[10px] bg-[#CCFF00] text-black px-2 py-1 rounded font-bold">GUIA</span>}
                    {userRole === 'ADMIN' && <span className="text-[10px] bg-red-500 text-white px-2 py-1 rounded font-bold">ADMIN</span>}
                    <button onClick={toggleTheme} className="p-2 bg-slate-100 dark:bg-zinc-900 rounded-xl">
                        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                </div>
            </header>

            <main className="max-w-[600px] mx-auto pt-24 px-6 space-y-8">
                {loading ? (
                    <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-[#CCFF00]" /></div>
                ) : (
                    <>
                        {/* ADMIN VIEW */}
                        {viewState === 'ADMIN_DASH' && (
                            <div className="space-y-6">
                                <h1 className="text-2xl font-black italic uppercase">Todas as Equipes</h1>
                                <div className="space-y-4">
                                    {adminTeams.map(t => (
                                        <div key={t.id} className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-slate-200 dark:border-white/10 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-lg">{t.name}</h3>
                                                <div className="text-xs text-slate-400">Líder: {t.leaderName}</div>
                                                <div className="text-xs text-slate-400">Membros: {t.memberCount}</div>
                                            </div>
                                            <button className="px-4 py-2 bg-slate-100 dark:bg-white/10 rounded-xl text-xs font-bold uppercase hover:bg-[#CCFF00] hover:text-black transition-colors">
                                                Gerenciar
                                            </button>
                                        </div>
                                    ))}
                                    {adminTeams.length === 0 && <p className="text-slate-400">Nenhuma equipe encontrada.</p>}
                                </div>
                            </div>
                        )}

                        {/* NO TEAM VIEW (GUIDE/MEMBER) */}
                        {viewState === 'NO_TEAM' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="text-center space-y-2">
                                    <div className="w-20 h-20 bg-[#CCFF00]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#CCFF00]/20">
                                        <Users size={40} className="text-[#CCFF00]" />
                                    </div>
                                    <h1 className="text-2xl font-black italic uppercase">Sem Equipe</h1>
                                    <p className="text-xs font-medium text-slate-400 max-w-[200px] mx-auto">
                                        {userRole === 'GUIDE' ? 'Funde seu esquadrão agora.' : 'Aguarde ser adicionado por um Guia.'}
                                    </p>
                                </div>

                                {userRole === 'GUIDE' ? (
                                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-[2rem] shadow-lg">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-[#CCFF00] rounded-lg text-black"><Plus size={18} /></div>
                                            <h3 className="text-sm font-black uppercase italic">Criar Nova Equipe</h3>
                                        </div>
                                        <div className="space-y-3">
                                            <input
                                                placeholder="Nome do Esquadrão"
                                                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#CCFF00]"
                                                value={inputName}
                                                onChange={e => setInputName(e.target.value)}
                                            />
                                            <button onClick={handleCreate} className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform">
                                                Fundar Equipe
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // MEMBER: Join via code (optional, but good UX)
                                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-6 rounded-[2rem]">
                                        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest pl-1">Entrar com código</h3>
                                        <div className="flex gap-2">
                                            <input
                                                placeholder="ID ou Nome da Equipe"
                                                className="flex-1 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#CCFF00]"
                                                value={inputCode}
                                                onChange={e => setInputCode(e.target.value)}
                                            />
                                            <button onClick={handleJoin} className="p-3 bg-[#CCFF00] text-black rounded-xl hover:scale-110 transition-transform">
                                                <ArrowRight />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TEAM DASH (MEMBER & GUIDE WITH TEAM) */}
                        {viewState === 'TEAM_DASH' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Esquadrão</span>
                                    <h1 className="text-3xl font-black italic uppercase text-[#CCFF00] mb-2 drop-shadow-sm">{teamData?.teamName}</h1>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#CCFF00]/10 rounded-full border border-[#CCFF00]/20">
                                        <Users size={12} className="text-[#CCFF00]" />
                                        <span className="text-[10px] font-bold text-[#CCFF00] uppercase">{teamData?.members?.length} Membros</span>
                                    </div>
                                </div>

                                {/* GUIDE TOOLBOX */}
                                {(userRole === 'GUIDE' || userRole === 'ADMIN') && (
                                    <div className="bg-[#CCFF00]/10 border border-[#CCFF00]/20 p-5 rounded-3xl">
                                        <h3 className="text-xs font-black uppercase text-[#CCFF00] mb-3">Adicionar Membro (Guia)</h3>
                                        <div className="flex gap-2">
                                            <input
                                                placeholder="Username do membro"
                                                className="flex-1 bg-white dark:bg-black/40 rounded-xl px-4 py-2 text-sm font-bold outline-none border border-transparent focus:border-[#CCFF00]"
                                                value={inputMember}
                                                onChange={e => setInputMember(e.target.value)}
                                            />
                                            <button onClick={handleAddMember} className="p-3 bg-[#CCFF00] text-black rounded-xl hover:scale-105 transition-transform">
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {teamData?.members?.map((member: any, idx: number) => (
                                        <div key={member.username} className={`flex items-center justify-between p-4 rounded-3xl border transition-all hover:scale-[1.01] ${member.username === teamData.isLeader ? 'bg-[#CCFF00]/5 border-[#CCFF00]/30' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-xs uppercase text-slate-500">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{member.username}</h3>
                                                        {((member as any).role === 'GUIDE' || (member as any).role === 'ADMIN' || member.isLeader) && <Crown size={12} className="text-[#CCFF00] fill-[#CCFF00]" />}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{member.role}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="block text-lg font-black italic tabular-nums leading-none">{member.totalScore}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">pts</span>
                                                </div>
                                                {/* Visual trash icon for leaders/admins to indicate they can remove (api logic pending for removal) */}
                                                {((userRole === 'GUIDE' && teamData.isLeader) || userRole === 'ADMIN') && !member.isLeader && (
                                                    <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* NAV FOOTER */}
            <footer className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pointer-events-none">
                <div className="max-w-[500px] mx-auto pointer-events-auto">
                    <div className="bg-white/95 dark:bg-[#1a1c21]/95 border border-slate-200 dark:border-white/10 p-2.5 rounded-[3rem] flex items-center justify-between shadow-2xl backdrop-blur-3xl ring-1 ring-black/5 dark:ring-white/5">
                        <button onClick={() => window.location.href = "/dashboard"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-all group">
                            <Home size={24} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
                        </button>

                        <button className="flex-1 flex flex-col items-center gap-2 py-5 bg-[#CCFF00] text-black rounded-[2.5rem] shadow-xl transition-all">
                            {userRole === 'ADMIN' ? <Shield size={24} strokeWidth={2.5} /> : <Users size={24} strokeWidth={2.5} />}
                            <span className="text-[9px] font-black uppercase tracking-tighter">
                                {userRole === 'ADMIN' ? 'Admin' : 'Equipe'}
                            </span>
                        </button>

                        <button onClick={() => window.location.href = "/history"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-all group">
                            <HistoryIcon size={24} className="group-hover:scale-110 transition-transform" />
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
