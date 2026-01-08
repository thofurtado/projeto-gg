"use client"
import { useState, useEffect, useRef } from "react"
import { ChevronLeft, Trash2, Trophy, TrendingUp, Flag, Plus, Settings2, Loader2 } from "lucide-react"
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
  const [username, setUsername] = useState("")
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') return
      const user = localStorage.getItem("user_gg")
      if (!user) {
        window.location.href = "/"
        return
      }
      setUsername(user)
      const saved = await storage.get(`metas_v3_${user}`)
      if (saved) setSelectedGroups(saved)
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
      ex[field] = Math.max(0, parseFloat((ex[field] + dynamicStep).toFixed(2)))
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
            meta: ['volume', 'time'].includes(ex.type) ? Math.ceil(metaCalculada) : parseFloat(metaCalculada.toFixed(2)),
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

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-40">
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-16 h-16 text-green-500 animate-spin mb-8" />
          <h2 className="text-3xl font-black italic uppercase text-white animate-pulse">Forjando <span className="text-green-500">Evolução</span></h2>
          <p className="text-zinc-500 mt-4 font-bold uppercase text-[10px] tracking-[0.3em]">Calculando progressão para 120 dias...</p>
        </div>
      )}

      <header className="flex items-center justify-between mb-8">
        <button onClick={() => window.location.href = "/dashboard"} className="p-3 bg-zinc-900 rounded-2xl"><ChevronLeft /></button>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">ENGINE <span className="text-green-500">CUSTOM</span></h1>
        <button onClick={addGroup} className="bg-white text-black h-12 px-6 rounded-2xl font-black uppercase text-[11px]">+ Modalidade</button>
      </header>

      <div className="space-y-6 max-w-xl mx-auto">
        {selectedGroups.map((group) => (
          <div key={group.id} className="bg-zinc-900 rounded-[32px] border border-zinc-800 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase italic text-green-500">{group.type}</h3>
              <button onClick={() => setSelectedGroups(selectedGroups.filter(g => g.id !== group.id))} className="text-zinc-700 hover:text-red-500"><Trash2 size={20} /></button>
            </div>
            <div className="space-y-4">
              {group.exercises.map((ex, idx) => (
                <div key={idx} className="bg-zinc-950 p-5 rounded-[28px] border border-zinc-800/50 space-y-4 relative">
                  <div className="flex gap-2">
                    <input className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold w-full outline-none focus:border-green-500" value={ex.name} onChange={(e) => updateEx(group.id, idx, { name: e.target.value })} />
                    <select className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2 text-[10px] font-black uppercase outline-none text-green-500" value={ex.type} onChange={(e) => updateEx(group.id, idx, { type: e.target.value as any })}>
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
                      <div key={field} className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-zinc-600 flex items-center gap-1 italic">
                          {field === 'current' ? <TrendingUp size={10} /> : <Flag size={10} />} {field === 'current' ? 'Hoje' : 'Meta'}
                        </label>
                        <div className={`flex items-center justify-between rounded-2xl p-2 border ${field === 'current' ? 'bg-zinc-900 border-zinc-800' : 'bg-green-500/5 border-green-500/20'}`}>
                          <button onMouseDown={() => startHold(group.id, idx, field, -1)} onMouseUp={stopHold} onMouseLeave={stopHold} onTouchStart={(e) => { e.preventDefault(); startHold(group.id, idx, field, -1) }} onTouchEnd={stopHold} className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-zinc-800">-</button>
                          <div className="text-center select-none">
                            <p className="font-black text-sm tabular-nums leading-none">{ex[field]}</p>
                            <span className="text-[7px] font-bold uppercase text-zinc-500">{ex.unit}</span>
                          </div>
                          <button onMouseDown={() => startHold(group.id, idx, field, 1)} onMouseUp={stopHold} onMouseLeave={stopHold} onTouchStart={(e) => { e.preventDefault(); startHold(group.id, idx, field, 1) }} onTouchEnd={stopHold} className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-zinc-800">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => addExercise(group.id)} className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-[24px] flex items-center justify-center gap-2 text-zinc-600 font-black text-[10px] uppercase hover:border-green-500 transition-all"><Plus size={16} /> Novo Exercício</button>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent z-50">
        <button onClick={handleSave} className="w-full max-w-xl mx-auto bg-green-500 text-black font-black py-6 rounded-[32px] flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(34,197,94,0.4)] active:scale-95 transition-all text-lg uppercase italic">SALVAR FORJA <Settings2 size={22} /></button>
      </div>
    </div>
  )
}