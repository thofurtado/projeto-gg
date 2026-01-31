"use client"
import { useState, useEffect, useRef } from "react"
import { ChevronLeft, Trash2, Trophy, TrendingUp, Flag, Plus, Settings2, Loader2, Home, Activity, User } from "lucide-react"
import { toast } from "sonner"
import { storage } from "@/lib/storage"

interface Exercise {
  name: string
  current: number
  target: number
  unit: string
  type: 'volume' | 'time' | 'weight' | 'dist' | 'pace' | 'speed'
}

interface Group {
  id: number
  type: string
  exercises: Exercise[]
}

export default function ConfigTreinoPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [username, setUsername] = useState("")
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') return

      const savedTheme = localStorage.getItem("theme_gg") as 'light' | 'dark'
      if (savedTheme) {
        setTheme(savedTheme)
        document.documentElement.classList.toggle('dark', savedTheme === 'dark')
      }

      const user = localStorage.getItem("user_gg")
      if (!user) {
        window.location.href = "/"
        return
      }
      setUsername(user)
      const saved = await storage.get(`metas_v3_${user}`)
      if (saved) setSelectedGroups(saved)

      setLoading(false)
      setMounted(true)
    }
    init()
  }, [])

  const solvePhysics = (exs: Exercise[], field: 'current' | 'target', lastType: string) => {
    const d = exs.find(e => e.type === "dist")
    const t = exs.find(e => e.type === "time")
    const p = exs.find(e => e.type === "pace")
    const s = exs.find(e => e.type === "speed")
    if (!d || !t) return
    if (lastType === "dist" || lastType === "time") {
      if (p) p[field] = d[field] > 0 ? parseFloat((t[field] / d[field]).toFixed(2)) : 0
      if (s) s[field] = t[field] > 0 ? parseFloat(((d[field] / t[field]) * 60).toFixed(1)) : 0
    } else if (lastType === "pace" && p) {
      t[field] = parseFloat((d[field] * p[field]).toFixed(1))
    } else if (lastType === "speed" && s) {
      t[field] = s[field] > 0 ? parseFloat(((d[field] / s[field]) * 60).toFixed(1)) : 0
    }
  }

  const addGroup = () => {
    const name = prompt("Nome da nova Modalidade:")
    if (!name) return
    setSelectedGroups([...selectedGroups, { id: Date.now(), type: name, exercises: [] }])
  }

  const addExercise = (groupId: number) => {
    const name = prompt("Nome do Exercício:")
    if (!name) return
    setSelectedGroups(prev => prev.map(g => g.id === groupId ? {
      ...g, exercises: [...g.exercises, { name, current: 0, target: 10, unit: "rep", type: "volume" }]
    } : g))
  }

  const adjust = (groupId: number, exIndex: number, field: 'current' | 'target', step: number) => {
    setSelectedGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      const newExs = JSON.parse(JSON.stringify(g.exercises))
      const ex = newExs[exIndex] as Exercise
      const heldDuration = Date.now() - startTimeRef.current
      let dynamicStep = step

      if (heldDuration > 3500 && !['pace', 'dist', 'speed'].includes(ex.type)) dynamicStep = step * 10
      else if (heldDuration > 1500 && !['pace', 'dist', 'speed'].includes(ex.type)) dynamicStep = step * 2

      ex[field] = Math.max(0, parseFloat((ex[field] + dynamicStep).toFixed(1)))
      solvePhysics(newExs, field, ex.type)
      return { ...g, exercises: newExs }
    }))
  }

  const startHold = (gId: number, exIdx: number, field: 'current' | 'target', step: number) => {
    startTimeRef.current = Date.now()
    adjust(gId, exIdx, field, step)
    let speed = 250
    const run = () => {
      const held = Date.now() - startTimeRef.current
      adjust(gId, exIdx, field, step)
      if (held < 1500) speed = 200
      else if (held < 3000) speed = 100
      else speed = 40
      timerRef.current = setTimeout(run, speed)
    }
    timerRef.current = setTimeout(run, 400)
  }

  const stopHold = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    startTimeRef.current = 0
  }

  const updateEx = (gId: number, idx: number, data: Partial<Exercise>) => {
    setSelectedGroups(prev => prev.map(g => {
      if (g.id !== gId) return g
      const newExs = [...g.exercises]
      newExs[idx] = { ...newExs[idx], ...data }
      if (data.type) {
        const units: Record<string, string> = { volume: 'rep', time: 'seg', weight: 'kg', dist: 'km', pace: 'min/km', speed: 'km/h' }
        newExs[idx].unit = units[data.type]
      }
      return { ...g, exercises: newExs }
    }))
  }

  const handleSave = async () => {
    setIsGenerating(true)
    const plano120Dias: any = {}

    selectedGroups.forEach(group => {
      plano120Dias[group.type] = []
      for (let dia = 1; dia <= 120; dia++) {
        const metasDoDia = group.exercises.map(ex => {
          const diferenca = ex.target - ex.current
          const progresso = (diferenca / 120) * dia
          const metaCalculada = ex.current + progresso
          return {
            name: ex.name,
            unit: ex.unit,
            type: ex.type,
            meta: ['volume', 'time'].includes(ex.type) ? Math.ceil(metaCalculada) : parseFloat(metaCalculada.toFixed(1)),
            realizado: 0,
            concluido: false
          }
        })
        plano120Dias[group.type].push({ dia, exercicios: metasDoDia })
      }
    })

    try {
      await storage.save(`plano_120_dias_${username}`, plano120Dias)
      await storage.save(`metas_v3_${username}`, selectedGroups)
      await storage.save(`dia_atual_treino_${username}`, "1")

      toast.success("Evolução Forjada!")
      setTimeout(() => {
        window.location.href = "/dashboard"
      }, 1000)
    } catch (error) {
      toast.error("Erro ao salvar no servidor.")
    } finally {
      setIsGenerating(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="text-[#CCFF00] animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#121417] text-slate-900 dark:text-white font-sans selection:bg-[#CCFF00]/30 transition-colors pb-40 ${theme}`}>
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-white/90 dark:bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-16 h-16 text-[#CCFF00] animate-spin mb-8" />
          <h2 className="text-3xl font-black italic uppercase text-slate-900 dark:text-white animate-pulse">Forjando <span className="text-[#CCFF00]">Arena</span></h2>
          <p className="text-slate-400 dark:text-zinc-500 mt-4 font-bold uppercase text-[10px] tracking-[0.3em]">Calculando progressão para 120 dias...</p>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#121417]/90 backdrop-blur-3xl border-b border-slate-200 dark:border-white/5 px-6 py-5 flex items-center justify-between shadow-sm">
        <button onClick={() => window.location.href = "/dashboard"} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CCFF00]">Engine Custom</span>
          <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">Forja de Treino</h1>
        </div>
        <button onClick={addGroup} className="bg-[#CCFF00] text-black h-11 px-6 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-[#CCFF00]/10 active:scale-95 transition-all">
          + Modalidade
        </button>
      </header>

      <main className="max-w-[600px] mx-auto pt-28 px-6 space-y-8">
        {selectedGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <Activity size={60} className="mb-4 text-slate-300" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Nenhuma modalidade configurada</p>
            <p className="text-[10px] font-bold mt-2">Toque em + Modalidade para começar</p>
          </div>
        )}

        {selectedGroups.map((group) => (
          <div key={group.id} className="bg-white dark:bg-white/5 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-7 shadow-soft">
            <div className="flex justify-between items-center mb-8 px-1">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-[#CCFF00] rounded-full" />
                <h3 className="text-xl font-black uppercase italic text-slate-900 dark:text-white leading-none">{group.type}</h3>
              </div>
              <button onClick={() => setSelectedGroups(selectedGroups.filter(g => g.id !== group.id))} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {group.exercises.map((ex, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#1a1c21] p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-6 relative group/ex">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider w-full outline-none focus:border-[#CCFF00] transition-colors shadow-sm"
                      value={ex.name}
                      onChange={(e) => updateEx(group.id, idx, { name: e.target.value })}
                      placeholder="NOME DO EXERCÍCIO"
                    />
                    <select
                      className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-[10px] font-black uppercase outline-none text-[#CCFF00] shadow-sm appearance-none"
                      value={ex.type}
                      onChange={(e) => updateEx(group.id, idx, { type: e.target.value as any })}
                    >
                      <option value="volume">Repetições</option>
                      <option value="time">Tempo (Seg)</option>
                      <option value="dist">Distância (Km)</option>
                      <option value="weight">Peso (Kg)</option>
                      <option value="pace">Pace (Min/Km)</option>
                      <option value="speed">Velocidade (Km/h)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(['current', 'target'] as const).map((field) => (
                      <div key={field} className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-600 flex items-center gap-2 italic tracking-widest pl-2">
                          {field === 'current' ? <TrendingUp size={12} /> : <Flag size={12} />}
                          {field === 'current' ? 'Base' : 'Meta Final'}
                        </label>
                        <div className={`flex items-center justify-between rounded-[1.5rem] p-2 border transition-all ${field === 'current'
                            ? 'bg-white dark:bg-black/40 border-slate-200 dark:border-white/5'
                            : 'bg-[#CCFF00]/5 border-[#CCFF00]/20'
                          }`}>
                          <button
                            onMouseDown={() => startHold(group.id, idx, field, -0.1)}
                            onMouseUp={stopHold} onMouseLeave={stopHold}
                            onTouchStart={(e) => { e.preventDefault(); startHold(group.id, idx, field, -0.1) }}
                            onTouchEnd={stopHold}
                            className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-[#121417] text-slate-600 dark:text-white border border-slate-100 dark:border-white/5 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          >
                            -
                          </button>
                          <div className="text-center flex flex-col items-center">
                            <p className="font-black text-lg italic text-slate-900 dark:text-white tabular-nums leading-none">{(ex[field] || 0).toFixed(1)}</p>
                            <span className="text-[8px] font-bold uppercase text-slate-400 dark:text-zinc-500 mt-1">{ex.unit}</span>
                          </div>
                          <button
                            onMouseDown={() => startHold(group.id, idx, field, 0.1)}
                            onMouseUp={stopHold} onMouseLeave={stopHold}
                            onTouchStart={(e) => { e.preventDefault(); startHold(group.id, idx, field, 0.1) }}
                            onTouchEnd={stopHold}
                            className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-[#121417] text-slate-600 dark:text-white border border-slate-100 dark:border-white/5 hover:bg-[#CCFF00] hover:text-black transition-all shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => addExercise(group.id)}
                className="w-full py-5 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2rem] flex items-center justify-center gap-3 text-slate-400 dark:text-zinc-600 font-black text-[10px] uppercase hover:border-[#CCFF00] hover:text-[#CCFF00] transition-all bg-slate-50/50 dark:bg-black/10"
              >
                <Plus size={18} /> Novo Exercício na Modalidade
              </button>
            </div>
          </div>
        ))}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-50 dark:from-[#121417] via-slate-50/95 dark:via-[#121417]/95 to-transparent z-50">
        <div className="max-w-[600px] mx-auto">
          <button
            onClick={handleSave}
            className="w-full bg-[#CCFF00] text-black font-black py-7 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-xl shadow-[#CCFF00]/20 active:scale-95 transition-all text-sm uppercase italic"
          >
            Sincronizar Plano de 120 Dias <Settings2 size={24} />
          </button>
        </div>
      </div>

      {/* Footer Nav Integration */}
      <footer className="fixed bottom-0 left-0 right-0 z-[60] px-6 pb-6 pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
        <div className="max-w-[500px] mx-auto pointer-events-auto">
          <div className="bg-white/95 dark:bg-[#1a1c21]/95 border border-slate-200 dark:border-white/10 p-2.5 rounded-[3rem] flex items-center justify-between shadow-2xl backdrop-blur-3xl ring-1 ring-black/5 dark:ring-white/5">
            <button onClick={() => window.location.href = "/dashboard"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-all">
              <Home size={24} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Arena</span>
            </button>
            <button className="flex-1 flex flex-col items-center gap-2 py-5 bg-[#CCFF00] text-black rounded-[2.5rem] shadow-xl transition-all active:scale-95">
              <Activity size={24} strokeWidth={2.5} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Treino</span>
            </button>
            <button className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-all">
              <Trophy size={24} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Leader</span>
            </button>
            <button onClick={() => window.location.href = "/perfil"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-all">
              <User size={24} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Perfil</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}