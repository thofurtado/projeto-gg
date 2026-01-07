"use client"
import { useState, useEffect, useRef } from "react"
import { Activity, LayoutGrid, ChevronLeft, ChevronRight, Save, User, Droplets, Plus, Moon, Trophy, Undo, MessageSquare, Notebook, Scale, Dumbbell, Ruler, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { storage } from "@/lib/storage"

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [plano, setPlano] = useState<any>(null)
  const [diaVisualizado, setDiaVisualizado] = useState(1)
  const [diaAtualDoSistema, setDiaAtualDoSistema] = useState(1)

  const [userData, setUserData] = useState({
    username: "",
    config: { metaAgua: 3000 },
    medidas: [] as any[],
    ultimoRegistro: { weight: 0, height: 0, waist: 0, chest: 0, armL: 0, armR: 0 }
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
            config: { metaAgua: savedUser.config?.waterMeta || 3000 },
            medidas: savedUser.historico || [],
            ultimoRegistro: {
              weight: savedUser.ultimoRegistro?.weight || 0,
              height: savedUser.ultimoRegistro?.height || 0,
              waist: savedUser.ultimoRegistro?.waist || 0,
              chest: savedUser.ultimoRegistro?.chest || 0,
              armL: savedUser.ultimoRegistro?.armL || 0,
              armR: savedUser.ultimoRegistro?.armR || 0
            }
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

  const handleUpdateMedidas = async () => {
    const p = prompt("Novo Peso (kg):", userData.ultimoRegistro.weight.toString())
    if (p === null) return

    const cintura = prompt("Nova Cintura (cm) - Deixe vazio para manter:", userData.ultimoRegistro.waist.toString())
    const peito = prompt("Novo Peitoral (cm) - Deixe vazio para manter:", userData.ultimoRegistro.chest.toString())
    const bracoE = prompt("Braço Esq (cm) - Deixe vazio para manter:", userData.ultimoRegistro.armL.toString())
    const bracoD = prompt("Braço Dir (cm) - Deixe vazio para manter:", userData.ultimoRegistro.armR.toString())

    const novoRegistro = {
      data: new Date().toLocaleDateString(),
      weight: p !== "" ? parseFloat(p) : userData.ultimoRegistro.weight,
      waist: cintura !== "" && cintura !== null ? parseFloat(cintura) : userData.ultimoRegistro.waist,
      chest: peito !== "" && peito !== null ? parseFloat(peito) : userData.ultimoRegistro.chest,
      armL: bracoE !== "" && bracoE !== null ? parseFloat(bracoE) : userData.ultimoRegistro.armL,
      armR: bracoD !== "" && bracoD !== null ? parseFloat(bracoD) : userData.ultimoRegistro.armR,
      height: userData.ultimoRegistro.height
    }

    const novoHistorico = [...(userData.medidas || []), novoRegistro]

    const perfilCompleto = await storage.get(`perfil_${userData.username}`) || {}
    const novoPerfil = {
      ...perfilCompleto,
      historico: novoHistorico,
      ultimoRegistro: novoRegistro
    }

    setUserData(prev => ({
      ...prev,
      medidas: novoHistorico,
      ultimoRegistro: novoRegistro
    }))

    await storage.save(`perfil_${userData.username}`, novoPerfil)
    toast.success("Biometria atualizada!")
  }

  const adjustRealizado = (modalidade: string, exIdx: number, step: number) => {
    setPlano((prev: any) => {
      if (!prev) return prev
      const novoPlano = JSON.parse(JSON.stringify(prev))
      const ex = novoPlano[modalidade][diaVisualizado - 1]?.exercicios[exIdx]
      if (ex) {
        ex.realizado = Math.max(0, parseFloat(((ex.realizado || 0) + step).toFixed(2)))
        ex.concluido = true
      }
      return novoPlano
    })
  }

  const startHold = (m: string, i: number, s: number) => {
    stopHold(); startTimeRef.current = Date.now(); adjustRealizado(m, i, s)
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
    let ptsEx = 0, totalEx = 0
    Object.keys(plano).forEach(mod => {
      if (plano[mod][diaIdx]) {
        plano[mod][diaIdx].exercicios.forEach((e: any) => {
          totalEx++; if (e.concluido) ptsEx += Math.min(e.realizado / e.meta, 1)
        })
      }
    })
    const sEx = totalEx > 0 ? (ptsEx / totalEx) * 65 : 0
    const sAg = Math.min((totalAgua / (userData.config.metaAgua || 3000)) * 15, 15)
    const sSo = Math.min((dadosDoDia.sonoHoras / 8) * 20, 20)
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
        <Dumbbell className="text-zinc-700 w-16 h-16 mb-4 animate-pulse" />
        <h2 className="text-white font-black italic uppercase tracking-tighter">Plano não encontrado</h2>
        <button onClick={() => window.location.href = "/perfil"} className="bg-green-500 text-black px-8 py-3 rounded-xl font-black text-[10px] uppercase mt-6">Configurar Agora</button>
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
                      <div className="flex items-center bg-black/40 border border-zinc-800/50 rounded-xl p-1">
                        <button onMouseDown={() => startHold(mod, i, -1)} onMouseUp={stopHold} onMouseLeave={stopHold} className="w-8 h-8 rounded-lg bg-zinc-800 font-bold text-xs">-</button>
                        <span className="w-12 text-center text-base font-black italic text-white">{ex.realizado || 0}</span>
                        <button onMouseDown={() => startHold(mod, i, 1)} onMouseUp={stopHold} onMouseLeave={stopHold} className="w-8 h-8 rounded-lg bg-zinc-800 font-bold text-xs">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={async () => { await storage.save(`plano_120_dias_${userData.username}`, plano); toast.success("Sincronizado"); }} className="w-full bg-green-500 text-black py-3 rounded-2xl font-black text-[9px] uppercase mt-4 flex items-center justify-center gap-2">Salvar Treino <Save size={14} /></button>
          </div>

          <div className="bg-zinc-900/10 border border-zinc-800/40 p-5 rounded-[2rem]">
            <div className="flex items-center gap-2 mb-3 text-zinc-600">
              <Notebook size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Relatório do Dia</span>
            </div>
            <textarea
              value={dadosDoDia.relatorio}
              onChange={(e) => updateDia('relatorio', e.target.value)}
              placeholder="Notas sobre o dia..."
              className="w-full h-20 bg-transparent text-[11px] text-zinc-400 outline-none resize-none placeholder:text-zinc-800 italic"
            />
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-zinc-900/10 border border-zinc-800/30 rounded-[2.5rem] p-6">
            <div className="flex items-center gap-3 mb-6">
              <Activity size={18} className="text-green-500" />
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

          <div className="bg-zinc-900/10 border border-zinc-800/40 p-6 rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Scale size={18} className="text-zinc-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Status Biométrico</h2>
              </div>
              <button onClick={handleUpdateMedidas} className="px-4 py-2 bg-zinc-800 hover:bg-green-500 hover:text-black rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2">
                Registrar Evolução <ChevronUp size={14} />
              </button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { label: "Peso", val: userData.ultimoRegistro.weight, unit: "kg", color: "text-white" },
                { label: "Cintura", val: userData.ultimoRegistro.waist, unit: "cm", color: "text-zinc-400" },
                { label: "Peitoral", val: userData.ultimoRegistro.chest, unit: "cm", color: "text-zinc-400" },
                { label: "B. Esq", val: userData.ultimoRegistro.armL, unit: "cm", color: "text-zinc-400" },
                { label: "B. Dir", val: userData.ultimoRegistro.armR, unit: "cm", color: "text-zinc-400" },
                { label: "Altura", val: userData.ultimoRegistro.height, unit: "cm", color: "text-zinc-500" },
              ].map((m, i) => (
                <div key={i} className="bg-black/40 border border-zinc-800/50 p-3 rounded-2xl text-center">
                  <p className="text-[7px] font-black uppercase text-zinc-600 mb-1 tracking-tighter">{m.label}</p>
                  <p className={`text-lg font-black italic ${m.color}`}>{m.val}</p>
                  <p className="text-[6px] font-bold text-zinc-800 uppercase">{m.unit}</p>
                </div>
              ))}
            </div>
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
            <div className="text-center mb-4"><p className="text-2xl font-black italic text-blue-500/90 leading-none">{dadosDoDia.agua.reduce((acc, c) => acc + c.vol, 0)}ml</p></div>
            <button onClick={() => updateDia('agua', [...dadosDoDia.agua, { id: Date.now(), vol: copoSelecionado }])} className="w-full bg-blue-500 text-black py-2.5 rounded-xl font-black text-[9px] uppercase">+{copoSelecionado}ml</button>
            <select onChange={(e) => setCopoSelecionado(Number(e.target.value))} className="w-full bg-zinc-900 mt-2 text-[8px] font-black p-1 rounded">
              <option value={250}>250ml</option><option value={500}>500ml</option><option value={1000}>1L</option>
            </select>
          </div>

          <div className="bg-purple-600/5 border border-purple-500/10 p-5 rounded-[2.2rem]">
            <div className="flex items-center gap-2 text-purple-400 mb-4"><Moon size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Sono</span></div>
            <div className="flex items-center justify-between bg-black/40 border border-zinc-800/50 rounded-2xl p-1">
              <button onClick={() => updateDia('sonoHoras', Math.max(0, dadosDoDia.sonoHoras - 1))} className="w-8 h-8 rounded-lg bg-zinc-800">-</button>
              <span className="text-xl font-black italic text-white">{dadosDoDia.sonoHoras}h</span>
              <button onClick={() => updateDia('sonoHoras', Math.min(24, dadosDoDia.sonoHoras + 1))} className="w-8 h-8 rounded-lg bg-zinc-800">+</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}