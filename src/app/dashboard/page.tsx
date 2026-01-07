"use client"
import { useState, useEffect, useRef } from "react"
import { Activity, LayoutGrid, ChevronLeft, ChevronRight, Save, User, Droplets, Plus, Moon, Trophy, Undo, Frown, Meh, Smile, MessageSquare, Notebook, Scale, Dumbbell } from "lucide-react"
import { toast } from "sonner"
import { storage } from "@/lib/storage"

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [plano, setPlano] = useState<any>(null)
  const [diaVisualizado, setDiaVisualizado] = useState(1)
  const [diaAtualDoSistema, setDiaAtualDoSistema] = useState(1)

  const [userData, setUserData] = useState({
    username: "",
    notasGerais: "",
    config: { metaAgua: 3000 },
    medidas: [] as any[]
  })

  const [dadosDoDia, setDadosDoDia] = useState({
    agua: [] as { id: number, vol: number }[],
    sonoHoras: 0,
    sonoQualidade: null as string | null,
    relatorio: ""
  })

  const [copoSelecionado, setCopoSelecionado] = useState(250)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const loadData = async () => {
      setMounted(true)
      const user = localStorage.getItem("user_gg")
      if (user) {
        const p = await storage.get(`plano_120_dias_${user}`)
        if (p) setPlano(p)

        const savedUser = await storage.get(`perfil_${user}`)
        if (savedUser) {
          setUserData({
            username: user,
            notasGerais: savedUser.notasGerais || "",
            config: { metaAgua: savedUser.config?.waterMeta || 3000 },
            medidas: savedUser.historico || [] 
          })
        } else {
          setUserData(prev => ({ ...prev, username: user }))
        }

        const d = localStorage.getItem(`dia_atual_treino`)
        if (d) setDiaAtualDoSistema(parseInt(d))
      } else {
        window.location.href = "/"
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const loadDayData = async () => {
      if (mounted && userData.username) {
        const u = userData.username
        const d = diaVisualizado

        const agua = await storage.get(`agua_u${u}_d${d}`) || []
        const sono = await storage.get(`sono_u${u}_d${d}`) || "0"
        const humor = await storage.get(`humor_u${u}_d${d}`)
        const relat = await storage.get(`relat_u${u}_d${d}`) || ""

        setDadosDoDia({
          agua,
          sonoHoras: parseInt(sono),
          sonoQualidade: humor,
          relatorio: relat
        })
      }
    }
    loadDayData()
  }, [diaVisualizado, mounted, userData.username])

  const updateDia = async (campo: string, valor: any) => {
    setDadosDoDia(prev => ({ ...prev, [campo]: valor }))
    const keyMap: any = { agua: 'agua', sonoHoras: 'sono', sonoQualidade: 'humor', relatorio: 'relat' }
    await storage.save(`${keyMap[campo]}_u${userData.username}_d${diaVisualizado}`, valor)
  }

  const addMedida = async (peso: number) => {
    const novaMedida = { data: new Date().toLocaleDateString(), weight: peso }
    const novoHistorico = [...(userData.medidas || []), novaMedida]
    
    const perfilCompleto = await storage.get(`perfil_${userData.username}`) || {}
    const novoPerfil = {
      ...perfilCompleto,
      historico: novoHistorico,
      ultimoRegistro: { ...perfilCompleto.ultimoRegistro, weight: peso, data: new Date().toISOString() }
    }

    setUserData(prev => ({ ...prev, medidas: novoHistorico }))
    await storage.save(`perfil_${userData.username}`, novoPerfil)
    toast.success("Peso registrado!")
  }

  const adjustRealizado = (modalidade: string, exIdx: number, step: number) => {
    setPlano((prev: any) => {
      if (!prev) return prev
      const novoPlano = JSON.parse(JSON.stringify(prev))
      const exerciciosDia = novoPlano[modalidade][diaVisualizado - 1]?.exercicios
      if (exerciciosDia && exerciciosDia[exIdx]) {
        const ex = exerciciosDia[exIdx]
        ex.realizado = Math.max(0, parseFloat(((ex.realizado || 0) + step).toFixed(2)))
        ex.concluido = true
      }
      return novoPlano
    })
  }

  const startHold = (m: string, i: number, s: number) => {
    stopHold()
    startTimeRef.current = Date.now()
    adjustRealizado(m, i, s)
    const run = () => {
      adjustRealizado(m, i, s)
      const held = Date.now() - startTimeRef.current
      timerRef.current = setTimeout(run, held < 1500 ? 200 : 40)
    }
    timerRef.current = setTimeout(run, 400)
  }

  const stopHold = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } }

  const calculateDayScore = (diaIdx: number) => {
    if (!plano || !userData.username) return 0
    const totalAgua = dadosDoDia.agua.reduce((acc, c) => acc + c.vol, 0)
    const sonoLocal = dadosDoDia.sonoHoras

    let ptsEx = 0, totalEx = 0
    Object.keys(plano).forEach(mod => {
      if (plano[mod][diaIdx]) {
        plano[mod][diaIdx].exercicios.forEach((e: any) => {
          totalEx++
          if (e.concluido) ptsEx += Math.min(e.realizado / e.meta, 1)
        })
      }
    })

    const sEx = totalEx > 0 ? (ptsEx / totalEx) * 65 : 0
    const sAg = totalAgua >= (userData.config.metaAgua || 3000) ? 15 : (totalAgua / (userData.config.metaAgua || 3000)) * 15
    const sSo = sonoLocal >= 8 ? 20 : (sonoLocal / 8) * 20
    return Math.floor(sEx + sAg + sSo)
  }

  const getHeatmapColor = (ex: any, diaIndex: number) => {
    const isSelected = diaIndex + 1 === diaVisualizado
    const percent = (ex.realizado / ex.meta) * 100
    if (!ex.concluido || ex.realizado === 0) return `bg-zinc-900/40 border-zinc-800 ${isSelected ? 'ring-1 ring-white/50 scale-105 z-20' : ''}`
    if (percent >= 100) return `bg-green-500 text-black border-transparent ${isSelected ? 'ring-2 ring-white scale-110 z-20' : ''}`
    return `bg-green-800/60 text-green-100 border-green-700/30 ${isSelected ? 'ring-1 ring-white/50 scale-105 z-20' : ''}`
  }

  if (!mounted) return null

  if (!plano) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
          <Dumbbell className="text-zinc-700" />
        </div>
        <h2 className="text-white font-black italic uppercase tracking-tighter">Plano não encontrado</h2>
        <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-2 mb-6">Você precisa configurar seu perfil primeiro.</p>
        <button onClick={() => window.location.href = "/perfil"} className="bg-green-500 text-black px-8 py-3 rounded-xl font-black text-[10px] uppercase">Configurar Agora</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-green-500/30">
      <header className="max-w-[1800px] mx-auto p-4 flex justify-between items-center border-b border-zinc-900 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-black font-black italic">GG</div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">System // <span className="text-zinc-200">@{userData.username}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.location.href = "/perfil"} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 hover:text-green-500 transition-colors"><User size={18} /></button>
          <button className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800"><LayoutGrid size={18} /></button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-zinc-900/20 border border-zinc-800/40 p-5 rounded-[2.5rem] backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 bg-black/50 p-2 rounded-2xl border border-zinc-800/50">
              <button onClick={() => setDiaVisualizado(Math.max(1, diaVisualizado - 1))} className="p-2 hover:text-green-500"><ChevronLeft size={22} /></button>
              <div className="text-center">
                <h2 className="text-xl font-black italic uppercase text-white">DIA {diaVisualizado}</h2>
                <p className="text-[8px] font-bold uppercase text-green-500/70">{diaVisualizado === diaAtualDoSistema ? "Janela Ativa" : "Arquivo"}</p>
              </div>
              <button onClick={() => setDiaVisualizado(Math.min(120, diaVisualizado + 1))} className="p-2 hover:text-green-500"><ChevronRight size={22} /></button>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {Object.keys(plano).map(mod => (
                <div key={mod} className="space-y-1.5">
                  <p className="text-[8px] font-black uppercase text-zinc-600 ml-2 tracking-widest">{mod}</p>
                  {plano[mod][diaVisualizado - 1]?.exercicios.map((ex: any, i: number) => (
                    <div key={i} className="bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/40 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase text-zinc-400 truncate">{ex.name}</p>
                        <p className="text-[9px] font-black text-green-500/80 italic">{ex.meta}{ex.unit}</p>
                      </div>
                      <div className="flex items-center bg-black/40 border border-zinc-800/50 rounded-xl p-1 shadow-inner">
                        <button onMouseDown={() => startHold(mod, i, -1)} onMouseUp={stopHold} onMouseLeave={stopHold} className="w-8 h-8 rounded-lg bg-zinc-800 font-bold text-xs">-</button>
                        <span className="w-12 text-center text-base font-black italic text-white">{ex.realizado || 0}</span>
                        <button onMouseDown={() => startHold(mod, i, 1)} onMouseUp={stopHold} onMouseLeave={stopHold} className="w-8 h-8 rounded-lg bg-zinc-800 font-bold text-xs">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={async () => { await storage.save(`plano_120_dias_${userData.username}`, plano); toast.success("Sincronizado com Nuvem"); }} className="w-full bg-green-500 text-black py-3 rounded-2xl font-black text-[9px] uppercase mt-4 flex items-center justify-center gap-2">Sincronizar Dados <Save size={14} /></button>
          </div>

          <div className="bg-zinc-900/10 border border-zinc-800/40 p-5 rounded-[2rem]">
            <div className="flex items-center gap-2 mb-3 text-zinc-600">
              <Notebook size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Relatório do Dia</span>
            </div>
            <textarea
              value={dadosDoDia.relatorio}
              onChange={(e) => updateDia('relatorio', e.target.value)}
              placeholder="Como foi o treino hoje?"
              className="w-full h-20 bg-transparent text-[11px] text-zinc-400 outline-none resize-none placeholder:text-zinc-800 italic"
            />
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-zinc-900/10 border border-zinc-800/30 rounded-[2.5rem] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-500/10 rounded-lg"><Activity size={18} className="text-green-500" /></div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Fluxo de Evolução</h2>
            </div>
            <div className="overflow-x-auto pb-4 max-h-[400px]">
              <div className="inline-block min-w-full">
                <div className="flex gap-1.5 mb-6 ml-[130px]">
                  {Array.from({ length: 120 }).map((_, i) => (
                    <button key={i} onClick={() => setDiaVisualizado(i + 1)} className={`w-8 flex-shrink-0 text-center text-[8px] font-black ${i + 1 === diaVisualizado ? 'text-green-500' : 'text-zinc-800'}`}>D{i + 1}</button>
                  ))}
                </div>
                <div className="space-y-3">
                  {Object.keys(plano).map(mod => plano[mod][0]?.exercicios.map((baseEx: any, exIdx: number) => (
                    <div key={`${mod}-${exIdx}`} className="flex items-center gap-4">
                      <div className="w-[120px] text-[9px] font-black uppercase text-zinc-600 truncate">{baseEx.name}</div>
                      <div className="flex gap-1.5">
                        {plano[mod].map((diaData: any, dIdx: number) => (
                          <button key={dIdx} onClick={() => setDiaVisualizado(dIdx + 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[8px] font-bold border ${getHeatmapColor(diaData.exercicios[exIdx], dIdx)}`}>
                            {diaData.exercicios[exIdx].concluido ? diaData.exercicios[exIdx].realizado : diaData.exercicios[exIdx].meta}
                          </button>
                        ))}
                      </div>
                    </div>
                  )))}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/5 border border-dashed border-zinc-800/50 p-6 rounded-[2.5rem]">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={14} className="text-zinc-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Quadro de Recados Global</span>
            </div>
            <textarea
              value={userData.notasGerais}
              onChange={async (e) => {
                const n = { ...userData, notasGerais: e.target.value };
                setUserData(n);
                await storage.save(`perfil_${userData.username}`, n);
              }}
              className="w-full h-16 bg-zinc-900/20 rounded-2xl p-4 text-xs text-zinc-500 outline-none border border-zinc-800/30"
              placeholder="Lembretes fixos para todos os dias..."
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-br from-zinc-900/50 to-black border border-zinc-800/50 p-6 rounded-[2.2rem]">
            <div className="flex items-center gap-2 mb-2"><Trophy size={16} className="text-yellow-500" /><span className="text-[10px] font-black uppercase text-zinc-600">Day Score</span></div>
            <p className="text-5xl font-black italic text-white tracking-tighter leading-none">{calculateDayScore(diaVisualizado - 1)}</p>
          </div>

          <div className="bg-blue-600/5 border border-blue-500/10 p-5 rounded-[2.2rem]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-blue-400"><Droplets size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Água</span></div>
              <button onClick={() => updateDia('agua', dadosDoDia.agua.slice(0, -1))} className="p-1.5 text-red-500"><Undo size={14} /></button>
            </div>
            <div className="text-center mb-4"><p className="text-2xl font-black italic text-blue-500/90 tracking-tighter leading-none">{dadosDoDia.agua.reduce((acc, c) => acc + c.vol, 0)}ml</p></div>
            <button onClick={() => updateDia('agua', [...dadosDoDia.agua, { id: Date.now(), vol: copoSelecionado }])} className="w-full bg-blue-500 text-black py-2.5 rounded-xl font-black text-[9px] uppercase">+{copoSelecionado}ml</button>
            <select onChange={(e) => setCopoSelecionado(Number(e.target.value))} className="w-full bg-zinc-900 mt-2 text-[8px] font-black p-1 rounded">
              <option value={250}>250ml</option><option value={500}>500ml</option><option value={1000}>1L</option>
            </select>
          </div>

          <div className="bg-purple-600/5 border border-purple-500/10 p-5 rounded-[2.2rem]">
            <div className="flex items-center gap-2 text-purple-400 mb-4 px-1"><Moon size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Sono</span></div>
            <div className="flex items-center justify-between bg-black/40 border border-zinc-800/50 rounded-2xl p-1 mb-4">
              <button onClick={() => updateDia('sonoHoras', Math.max(0, dadosDoDia.sonoHoras - 1))} className="w-8 h-8 rounded-lg bg-zinc-800">-</button>
              <span className="text-xl font-black italic text-white">{dadosDoDia.sonoHoras}h</span>
              <button onClick={() => updateDia('sonoHoras', Math.min(24, dadosDoDia.sonoHoras + 1))} className="w-8 h-8 rounded-lg bg-zinc-800">+</button>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-[2.2rem]">
            <div className="flex items-center gap-2 text-zinc-400 mb-4"><Scale size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Medidas</span></div>
            <button onClick={() => {
              const p = prompt("Digite seu peso atual:");
              if (p) addMedida(parseFloat(p));
            }} className="w-full bg-zinc-800 text-white py-2.5 rounded-xl font-black text-[9px] uppercase">Registrar Peso</button>
            <div className="mt-3 space-y-1">
              {(userData.medidas || []).slice(-2).map((m, idx) => (
                <p key={idx} className="text-[8px] font-bold text-zinc-600 uppercase">{m.data}: {m.weight || m.peso}kg</p>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}