"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  Activity, Home, User, Droplets, Moon, Trophy,
  Undo, Dumbbell, Loader2, Pizza, CheckCircle2, Sun, Check,
  MessageSquare, Footprints, Bike, Waves, Wind, Plus, Edit3
} from "lucide-react"
import { toast } from "sonner"
import { storage } from "@/lib/storage"
import confetti from 'canvas-confetti'

// Default empty state to prevent data leaks between dates
const DEFAULT_DAY_DATA = {
  agua: [] as { id: number, vol: number }[],
  totalAgua: 0,
  sonoHoras: 0,
  ateFrutas: false,
  ateLegumes: false,
  ateProteina: false,
  exagereiHoje: false,
  dayScore: 0
};

const DEFAULT_SESSION = {
  type: "Musculação",
  customType: "",
  comment: "",
  points: 0,
  saved: false
};

import { useTheme } from "@/components/theme-provider"

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const { theme, toggleTheme } = useTheme() // Integração com ThemeContext
  const [diaVisualizado, setDiaVisualizado] = useState(1)
  const [diaAtualDoSistema, setDiaAtualDoSistema] = useState(1)

  const [userData, setUserData] = useState({
    username: "",
    config: { metaAgua: 3000 },
  })

  // States
  const [dadosDoDia, setDadosDoDia] = useState(DEFAULT_DAY_DATA)
  const [sessionActivity, setSessionActivity] = useState(DEFAULT_SESSION)

  // Smart Navigation Logic
  const [navVisible, setNavVisible] = useState(true)
  const navTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const resetNav = () => {
      setNavVisible(true)
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current)
      navTimeoutRef.current = setTimeout(() => {
        setNavVisible(false)
      }, 3000)
    }

    window.addEventListener('scroll', resetNav)
    window.addEventListener('touchstart', resetNav)
    window.addEventListener('click', resetNav)
    resetNav()

    return () => {
      window.removeEventListener('scroll', resetNav)
      window.removeEventListener('touchstart', resetNav)
      window.removeEventListener('click', resetNav)
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current)
    }
  }, [])

  // Real-time Score Calculation (Client-side immediate feedback)
  const calcularPlacarEmTempoReal = useCallback(() => {
    let pontuacao = 0;

    // 1. Pontos de Treino (Baseado no salvo/retornado do banco)
    pontuacao += sessionActivity.points;

    // 2. Água (+15 se bater 3000)
    if (dadosDoDia.totalAgua >= 3000) pontuacao += 15;

    // 3. Sono (+15 ideal, -10 critico)
    if (dadosDoDia.sonoHoras > 0) {
      if (dadosDoDia.sonoHoras < 5) pontuacao -= 10;
      else if (dadosDoDia.sonoHoras >= 5 && dadosDoDia.sonoHoras <= 8) pontuacao += 15;
    }

    // 4. Nutrição (+5 cada)
    if (dadosDoDia.ateFrutas) pontuacao += 5;
    if (dadosDoDia.ateLegumes) pontuacao += 5;
    if (dadosDoDia.ateProteina) pontuacao += 5;

    // 5. Penalidade (-20)
    if (dadosDoDia.exagereiHoje) pontuacao -= 20;

    return Math.max(0, pontuacao); // Nunca negativo visualmente
  }, [dadosDoDia, sessionActivity.points]);

  // Init
  useEffect(() => {
    const initApp = async () => {
      if (typeof window === 'undefined') return

      const user = localStorage.getItem("user_gg")
      if (!user) {
        window.location.href = "/"
        return
      }

      const diaAt = await storage.get(`dia_atual_treino_${user}`)
      const currentDay = diaAt ? parseInt(diaAt) : 1
      setDiaAtualDoSistema(currentDay)
      setDiaVisualizado(currentDay)
      setUserData(prev => ({ ...prev, username: user }))

      setMounted(true)
      setLoading(false)
    }
    initApp()
  }, [])

  // Data Persistence & Reset Logic
  useEffect(() => {
    if (!mounted || !userData.username) return

    // 1. Reset State IMMEDIATELY to prevent leaks
    setDadosDoDia(DEFAULT_DAY_DATA)
    setSessionActivity(DEFAULT_SESSION)

    const fetchDayData = async () => {
      const u = userData.username
      const targetDate = new Date()
      targetDate.setHours(0, 0, 0, 0)
      targetDate.setDate(targetDate.getDate() + (diaVisualizado - diaAtualDoSistema))

      try {
        const res = await fetch(`/api/daily-log?username=${u}&date=${targetDate.toISOString()}`)
        if (res.ok) {
          const data = await res.json()

          // 2. Update with fetched data ONLY
          if (data.dailyLog) {
            setDadosDoDia({
              agua: [{ id: 0, vol: data.dailyLog.waterMl || 0 }],
              totalAgua: data.dailyLog.waterMl || 0,
              sonoHoras: data.dailyLog.sleepHours || 0,
              ateFrutas: data.dailyLog.ateFruits || false,
              ateLegumes: data.dailyLog.ateVeggies || false,
              ateProteina: data.dailyLog.ateProtein || false,
              exagereiHoje: data.dailyLog.calorieAbuse || false,
              dayScore: data.dailyLog.dayScore || 0
            })
          }

          if (data.workoutLogs) {
            const session = data.workoutLogs.find((w: any) => w.exercise === 'SESSÃO_DIÁRIA');
            if (session) {
              const isCustom = !['Musculação', 'Corrida', 'Ciclismo', 'Natação', 'Yoga'].includes(session.modalidade);
              setSessionActivity({
                type: isCustom ? "Outro" : session.modalidade,
                customType: isCustom ? session.modalidade : "",
                comment: session.comment || "",
                points: session.pointsEarned || 0,
                saved: true
              });
            }
          }
        }
      } catch (err) {
        toast.error("Erro ao carregar dados")
      }
    }
    fetchDayData()
  }, [diaVisualizado, mounted, userData.username, diaAtualDoSistema])

  // Sync / Upsert Function
  const syncWithServer = async (updatedFields: any) => {
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0)
    targetDate.setDate(targetDate.getDate() + (diaVisualizado - diaAtualDoSistema));

    const currentData = { ...dadosDoDia, ...updatedFields };
    // Optimistic Update
    setDadosDoDia(currentData);

    try {
      await fetch('/api/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userData.username,
          date: targetDate.toISOString(),
          metrics: {
            waterMl: currentData.totalAgua,
            sleepHours: currentData.sonoHoras,
            ateFrutas: currentData.ateFrutas,
            ateVeggies: currentData.ateLegumes,
            ateProteina: currentData.ateProteina,
            calorieAbuse: currentData.exagereiHoje
          }
        })
      });
      // Silent success - score updates via local calc instantly, consistent via server next fetch
    } catch (e) {
      toast.error("Erro de conexão ao salvar")
    }
  }

  const updateAgua = (vol: number) => {
    // Logic to add water
    const newTotal = dadosDoDia.totalAgua + vol;
    const newHistory = [...dadosDoDia.agua, { id: Date.now(), vol }];
    syncWithServer({ agua: newHistory, totalAgua: newTotal });
  }

  const clearAgua = () => {
    syncWithServer({ agua: [], totalAgua: 0 });
  }

  const saveActivity = async () => {
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0)
    targetDate.setDate(targetDate.getDate() + (diaVisualizado - diaAtualDoSistema));

    const finalType = sessionActivity.type === "Outro" ? sessionActivity.customType : sessionActivity.type;

    if (sessionActivity.type === "Outro" && !sessionActivity.customType) {
      toast.error("Digite o nome da atividade");
      return;
    }

    try {
      const res = await fetch('/api/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userData.username,
          date: targetDate.toISOString(),
          sessionActivity: {
            type: finalType,
            comment: sessionActivity.comment
          }
        })
      });

      if (res.ok) {
        const result = await res.json();
        setSessionActivity(prev => ({ ...prev, saved: true, points: result.trainingPoints }));

        // Update local day score with server result just to be sure
        setDadosDoDia(prev => ({ ...prev, dayScore: result.dayScore }));

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#CCFF00', '#FFFFFF']
        });
        toast.success(`Atividade Salva! +${result.trainingPoints} pts`);
      }
    } catch (e) {
      toast.error("Erro ao registrar treino");
    }
  }



  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#CCFF00]" size={32} />
      </div>
    )
  }

  const modalidades = [
    { name: "Musculação", icon: <Dumbbell size={20} /> },
    { name: "Corrida", icon: <Footprints size={20} /> },
    { name: "Ciclismo", icon: <Bike size={20} /> },
    { name: "Natação", icon: <Waves size={20} /> },
    { name: "Yoga", icon: <Wind size={20} /> },
    { name: "Outro", icon: <Plus size={20} /> } // Custom Activity Button
  ];

  return (
    <div className={`min-h-screen bg-[#F8FAFC] dark:bg-[#121417] text-slate-900 dark:text-white font-sans transition-colors pb-32 ${theme}`}>
      {/* Placar Real-Time */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#121417]/90 backdrop-blur-3xl border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Placar do Dia</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none tabular-nums animate-in slide-in-from-bottom-2 fade-in duration-300">
              {calcularPlacarEmTempoReal()}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase italic">pts</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 active:scale-90 transition-all">
            {theme === 'light' ? <Moon size={18} className="text-slate-600" /> : <Sun size={18} className="text-[#CCFF00]" />}
          </button>
          <div className="w-14 h-14 bg-[#CCFF00] rounded-2xl flex items-center justify-center shadow-lg shadow-[#CCFF00]/20">
            <Trophy size={20} className="text-black" />
          </div>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto pt-24 px-6 space-y-8">

        {/* Date Selector */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-[2.5rem] shadow-soft">
          <div className="flex items-center justify-between mb-5 px-1">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Minha Jornada</h3>
            <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase leading-none italic">
              {diaVisualizado === diaAtualDoSistema ? 'Hoje' : `Dia ${diaVisualizado}`}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                onClick={() => setDiaVisualizado(d)}
                className={`flex-shrink-0 w-20 h-28 rounded-3xl flex flex-col items-center justify-center transition-all border-2 ${diaVisualizado === d
                  ? 'bg-[#CCFF00] border-[#CCFF00] shadow-xl shadow-[#CCFF00]/20 scale-105 z-10'
                  : 'bg-slate-50 dark:bg-[#1a1c21] border-slate-100 dark:border-white/5'
                  }`}
              >
                <span className={`text-[10px] font-black uppercase mb-2 ${diaVisualizado === d ? 'text-black' : 'text-slate-400'}`}>Dia {d}</span>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-2 ${diaVisualizado === d ? 'bg-black/10' : 'bg-slate-100 dark:bg-black/20'}`}>
                  {diaVisualizado === d ? <div className="w-2 h-2 rounded-full bg-black/50 dark:bg-white/50 animate-pulse" /> : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Água */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-soft">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Hidratação</h3>
            <button onClick={clearAgua} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Undo size={18} /></button>
          </div>
          <div className="flex gap-10 items-center">
            <div className="relative w-14 h-52 bg-slate-100 dark:bg-black/20 rounded-full overflow-hidden border-4 border-white dark:border-white/5 shadow-inner">
              <div
                className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                style={{ height: `${Math.min((dadosDoDia.totalAgua / 3000) * 100, 100)}%` }}
              />
            </div>
            <div className="flex-1 space-y-6">
              <div className="flex flex-col">
                <span className="text-6xl font-black italic text-slate-900 dark:text-white leading-none tabular-nums">{dadosDoDia.totalAgua}</span>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">ml de 3000ml</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => updateAgua(250)} className="flex-1 py-6 bg-slate-100 dark:bg-white/5 hover:bg-[#CCFF00] hover:text-black rounded-3xl font-black text-[10px] uppercase transition-all shadow-sm">Copo (250ml)</button>
                <button onClick={() => updateAgua(1000)} className="flex-1 py-6 bg-[#CCFF00] text-black rounded-3xl font-black text-[10px] uppercase shadow-lg shadow-[#CCFF00]/10 active:scale-95 transition-all">Garrafa (1L)</button>
              </div>
            </div>
          </div>
        </div>

        {/* Sono e Nutrição */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-soft">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sono (Horas)</h3>
              <span className="text-2xl font-black italic text-slate-900 dark:text-white">{dadosDoDia.sonoHoras.toFixed(1)}h</span>
            </div>
            <input
              type="range" min="0" max="12" step="0.5"
              value={dadosDoDia.sonoHoras}
              onChange={(e) => syncWithServer({ sonoHoras: parseFloat(e.target.value) })}
              className="w-full h-4 bg-slate-100 dark:bg-black/20 rounded-full appearance-none accent-[#CCFF00] mb-6"
            />
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-soft">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8">Nutrição Limpa</h3>
            <div className="flex gap-4 justify-between">
              {[
                { field: 'ateFrutas', emoji: '🍎' },
                { field: 'ateLegumes', emoji: '🥦' },
                { field: 'ateProteina', emoji: '🍗' },
              ].map(item => (
                <button
                  key={item.field}
                  onClick={() => syncWithServer({ [item.field]: !((dadosDoDia as any)[item.field]) })}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border transition-all ${(dadosDoDia as any)[item.field] ? 'bg-[#CCFF00]/10 border-[#CCFF00] shadow-sm scale-110' : 'bg-slate-50 border-slate-100 opacity-40'
                    }`}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => syncWithServer({ exagereiHoje: !dadosDoDia.exagereiHoje })}
              className={`w-full mt-6 py-4 rounded-2xl border transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase ${dadosDoDia.exagereiHoje ? 'bg-red-50 border-red-200 text-red-500' : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}
            >
              <Pizza size={14} /> {dadosDoDia.exagereiHoje ? 'Exagerei (-20 pts)' : 'Fui honesto!'}
            </button>
          </div>
        </div>

        {/* Registro de Atividade */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-soft">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-4 bg-[#CCFF00] rounded-full" />
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Registrar Atividade</h3>
          </div>

          {!sessionActivity.saved ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {modalidades.map(m => (
                  <button
                    key={m.name}
                    onClick={() => setSessionActivity(prev => ({ ...prev, type: m.name }))}
                    className={`py-5 rounded-3xl border flex flex-col items-center gap-3 transition-all ${sessionActivity.type === m.name
                      ? 'bg-[#CCFF00] border-[#CCFF00] text-black shadow-lg shadow-[#CCFF00]/20 scale-105'
                      : 'bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 text-slate-500'
                      }`}
                  >
                    {m.icon}
                    <span className="text-[8px] font-black uppercase tracking-tighter">{m.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom Activity Input */}
              {sessionActivity.type === "Outro" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 pl-1 italic">Qual o Esporte?</label>
                  <input
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#CCFF00]"
                    placeholder="Ex: Muay Thai, Crossfit..."
                    value={sessionActivity.customType}
                    onChange={(e) => setSessionActivity(prev => ({ ...prev, customType: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase text-slate-400 pl-1 flex items-center gap-2 italic">
                  <MessageSquare size={12} /> Comentários
                </label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-[2rem] p-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#CCFF00] transition-all resize-none h-32 shadow-inner"
                  placeholder="Detalhes do seu desempenho..."
                  value={sessionActivity.comment}
                  onChange={(e) => setSessionActivity(prev => ({ ...prev, comment: e.target.value }))}
                />
              </div>
              <button
                onClick={saveActivity}
                className="w-full bg-[#CCFF00] text-black py-7 rounded-[2.5rem] font-black text-xs uppercase flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-[#CCFF00]/20"
              >
                Finalizar e Pontuar <Check size={20} />
              </button>
            </div>
          ) : (
            <div className="bg-[#CCFF00]/5 border border-[#CCFF00]/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-[#CCFF00] rounded-full flex items-center justify-center text-black shadow-2xl">
                <Check size={40} strokeWidth={4} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase italic text-slate-900 dark:text-white">Atividade Registrada!</h3>
                <div className="flex items-center gap-2 justify-center mt-2">
                  <span className="px-3 py-1 bg-[#CCFF00] text-black rounded-lg text-[10px] font-black uppercase italic">
                    {sessionActivity.type === 'Outro' ? sessionActivity.customType : sessionActivity.type}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">+{sessionActivity.points} pts</span>
                </div>
              </div>
              {sessionActivity.comment && (
                <div className="bg-white/80 dark:bg-black/40 p-5 rounded-3xl w-full border border-slate-100 text-sm font-semibold italic text-slate-600">
                  "{sessionActivity.comment}"
                </div>
              )}
              <button
                onClick={() => setSessionActivity(prev => ({ ...prev, saved: false }))}
                className="text-[10px] font-black uppercase text-slate-400 underline hover:text-[#CCFF00]"
              >
                Editar ou Corrigir
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className={`fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pointer-events-none transition-all duration-500 ease-in-out ${navVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <div className="max-w-[500px] mx-auto pointer-events-auto">
          <div className="bg-white/95 dark:bg-[#1a1c21]/95 border border-slate-200 dark:border-white/10 p-3 rounded-[3rem] flex items-center justify-between shadow-2xl backdrop-blur-3xl ring-1 ring-black/5 dark:ring-white/10">
            <button onClick={() => window.location.reload()} className="flex-1 flex flex-col items-center gap-2 py-5 bg-[#CCFF00] text-black rounded-[2.5rem] shadow-xl transition-all active:scale-95">
              <Home size={28} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Início</span>
            </button>
            <button className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 hover:text-slate-900 dark:text-zinc-600">
              <Activity size={28} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Treino</span>
            </button>
            <button className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 hover:text-slate-900 dark:text-zinc-600">
              <Trophy size={28} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Ranking</span>
            </button>
            <button onClick={() => window.location.href = "/perfil"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 hover:text-slate-900 dark:text-zinc-600">
              <User size={28} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Perfil</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}