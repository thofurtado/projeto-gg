"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  Activity, Home, User, Droplets, Moon, Trophy,
  Undo, Dumbbell, Loader2, Pizza, CheckCircle2, Sun, Check,
  MessageSquare, Footprints, Bike, Waves, Wind, Plus, Edit3, Swords, AlertTriangle, Trash2, LogOut, Users, History as HistoryIcon
} from "lucide-react"
import { toast } from "sonner"
// import { storage } from "@/lib/storage" // Se não estiver usando, pode remover
import confetti from 'canvas-confetti'
import { useTheme } from "@/components/theme-provider"

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
  saved: false,
  id: ""
};

export default function DashboardPage() {
  // Estados de controle
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [verifyingSession, setVerifyingSession] = useState(true)

  // Estados principais
  const [userData, setUserData] = useState({
    username: "",
    config: { metaAgua: 3000 },
  })

  // Theme
  const { theme, toggleTheme } = useTheme()

  // Helper para dia da semana (1=Seg, 7=Dom)
  const getWeekDayIndex = () => {
    const d = new Date().getDay();
    // No JS, 0 é Domingo. Queremos que 0 vire 7 (para ser o último da semana visual BR)
    // Se quiser manter coerência com o Backend: 0=Dom.
    // Mas para visualização "Segunda a Domingo":
    return d === 0 ? 7 : d;
  };

  const [diaVisualizado, setDiaVisualizado] = useState(getWeekDayIndex())
  const [diaAtualDoSistema, setDiaAtualDoSistema] = useState(getWeekDayIndex())



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

  // --- CORREÇÃO AQUI: LÓGICA DE PLACAR VISUAL IGUAL AO BACKEND ---
  // --- CORREÇÃO AQUI: LÓGICA DE PLACAR VISUAL IGUAL AO BACKEND ---
  const calcularPlacarEmTempoReal = useCallback(() => {
    let pontuacao = 0;
    const metaAgua = userData.config.metaAgua || 3000;

    // 1. Pontos de Treino
    pontuacao += sessionActivity.points;

    // 2. Água (4pts Meta Cheia | 1.5pts Meia Meta | -1pt Abaixo)
    if (dadosDoDia.totalAgua >= metaAgua) pontuacao += 4;
    else if (dadosDoDia.totalAgua >= (metaAgua / 2)) pontuacao += 1.5;
    else pontuacao -= 1;

    // 3. Sono (FIX: 0h agora penaliza como <5h)
    if (dadosDoDia.sonoHoras < 5) pontuacao -= 4;
    else if (dadosDoDia.sonoHoras < 7) pontuacao += 3;
    else if (dadosDoDia.sonoHoras < 8) pontuacao += 5;
    else pontuacao += 8;

    // 4. Nutrição (+2 cada)
    if (dadosDoDia.ateFrutas) pontuacao += 2;
    if (dadosDoDia.ateLegumes) pontuacao += 2;
    if (dadosDoDia.ateProteina) pontuacao += 2;

    // 5. Penalidade (-5)
    if (dadosDoDia.exagereiHoje) pontuacao -= 5;

    return pontuacao;
  }, [dadosDoDia, sessionActivity.points, userData.config.metaAgua]);

  // Init
  useEffect(() => {
    const initApp = async () => {
      // 1. Verifica LocalStorage
      const storedUser = localStorage.getItem("user_gg")

      if (!storedUser) {
        window.location.href = "/"
        return
      }

      try {
        // 2. Verifica no Backend se o usuário ainda existe (POST)
        const res = await fetch('/api/user/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: storedUser })
        })

        let waterGoal = 3000;

        // CRUCIAL: Se der erro de rede (offline) ou 500, o fetch não joga erro (exceto network), 
        // mas res.ok será false.

        if (res.ok) {
          const data = await res.json()
          if (!data.valid) {
            // Respondeu 200 mas disse inválido (logica nossa)
            // Ou se respondeu 404
            throw new Error("AUTH_INVALID")
          }
          if (data.waterGoal) waterGoal = data.waterGoal
        } else if (res.status === 404 || res.status === 401) {
          // Resposta explicita de não autorizado
          throw new Error("AUTH_INVALID")
        } else {
          // Se for 500 ou outro erro genérico, assumimos "Offline Mode" ou erro temporário
          console.warn("API Check falhou, mas permitindo acesso (Modo Offline/Dev)")
        }

        // 3. Sucesso (ou Fail-Open): Configura estados
        const currentDay = getWeekDayIndex()
        setDiaAtualDoSistema(currentDay)
        setDiaVisualizado(currentDay)
        setUserData(prev => ({
          ...prev,
          username: storedUser,
          config: { metaAgua: waterGoal }
        }))

        setMounted(true)
        setVerifyingSession(false)
        setLoading(false)

      } catch (error: any) {
        // Só desloga se for erro de autenticação explícito
        if (error.message === "AUTH_INVALID") {
          console.error("Sessão inválida:", error)
          localStorage.removeItem("user_gg")
          window.location.href = "/"
        } else {
          // Erro de conexão ou outro: Deixa entrar (Fail Open)
          console.warn("Erro de conexão na verificação. Permitindo acesso.", error)
          const currentDay = getWeekDayIndex()
          setDiaAtualDoSistema(currentDay)
          setDiaVisualizado(currentDay)
          setUserData(prev => ({ ...prev, username: storedUser }))

          setMounted(true)
          setVerifyingSession(false)
          setLoading(false)
        }
      }
    }

    initApp()
  }, [])

  // Data Fetching Logic (Triggered by username set)
  useEffect(() => {
    if (!userData.username) return

    const fetchDayData = async () => {
      setLoading(true)
      const u = userData.username

      try {
        const res = await fetch(`/api/daily-log?username=${u}`) // Pega log de hoje
        if (res.ok) {
          const data = await res.json()

          if (data && data.todayLog) {
            setDadosDoDia({
              agua: [],
              totalAgua: data.todayLog.waterMl || 0,
              sonoHoras: data.todayLog.sleepHours || 0,
              ateFrutas: data.todayLog.ateFruits || false,
              ateLegumes: data.todayLog.ateVeggies || false,
              ateProteina: data.todayLog.ateProtein || false,
              exagereiHoje: data.todayLog.calorieAbuse || false,
              dayScore: data.todayLog.dayScore || 0
            })

            // Sessão
            if (data.todayLog.workoutLogs && data.todayLog.workoutLogs.length > 0) {
              const lastWorkout = data.todayLog.workoutLogs[0]
              setSessionActivity({
                type: lastWorkout.modalidade,
                customType: lastWorkout.modalidade === 'Outro' ? lastWorkout.exercise : '',
                comment: lastWorkout.comment || '',
                points: lastWorkout.pointsEarned,
                saved: true,
                id: lastWorkout.id
              })
            } else {
              setSessionActivity(DEFAULT_SESSION)
            }
          } else {
            setDadosDoDia(DEFAULT_DAY_DATA)
            setSessionActivity(DEFAULT_SESSION)
          }
        }
      } catch (err) {
        toast.error("Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    }

    if (!verifyingSession) {
      fetchDayData()
    }
  }, [userData.username, verifyingSession])


  // Prevenir renderização antes da montagem
  if (!mounted) return null

  // Tela de Loading de Sessão
  if (verifyingSession) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-[#CCFF00] animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Verificando Credenciais...</p>
      </div>
    )
  }

  // Sync / Upsert Function
  const syncWithServer = async (updatedFields: any) => {
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0)
    // targetDate.setDate(targetDate.getDate() + (diaVisualizado - diaAtualDoSistema)); // Se diaVisualizado for sempre hoje, isso é 0.

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
        const workoutId = result.workoutId || "";
        setSessionActivity(prev => ({ ...prev, saved: true, points: result.trainingPoints, id: workoutId }));

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

  // Função de Deleção Corrigida
  const deleteActivity = async () => {
    if (!sessionActivity.id) return;

    if (!window.confirm("Tem certeza que deseja excluir este treino? A pontuação será removida.")) {
      return;
    }

    try {
      const res = await fetch('/api/daily-log', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutLogId: sessionActivity.id }) // Padronizado para workoutLogId
      });

      if (res.ok) {
        const data = await res.json();
        setSessionActivity(DEFAULT_SESSION);
        // Atualiza o dadosDoDia com o novo score retornado pelo backend
        setDadosDoDia(prev => ({ ...prev, dayScore: data.dayScore }));
        toast.success("Atividade removida com sucesso");
      } else {
        toast.error("Erro ao remover atividade");
      }
    } catch (e) {
      toast.error("Erro de conexão");
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
    { name: "Caminhada", icon: <Footprints size={20} /> },
    { name: "Ciclismo", icon: <Bike size={20} /> },
    { name: "Natação", icon: <Waves size={20} /> },
    { name: "Lutas", icon: <Swords size={20} /> },
    { name: "Outro", icon: <Plus size={20} /> }
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

          <button
            onClick={() => {
              localStorage.removeItem("user_gg");
              window.location.href = "/";
            }}
            className="w-14 h-14 bg-red-500/10 hover:bg-red-500 rounded-2xl flex items-center justify-center border border-red-500/20 transition-all group"
          >
            <LogOut size={20} className="text-red-500 group-hover:text-white transition-colors" />
          </button>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto pt-24 px-6 space-y-8">

        {/* Date Selector - Clean UI */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-[2.5rem] shadow-soft">
          <div className="flex items-center justify-between mb-5 px-3">
            <div className="flex flex-col w-full mr-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2">Dia {diaVisualizado} <span className="text-slate-300 dark:text-white/20">/ 7</span></h3>
              <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-[#CCFF00]" style={{ width: `${(diaVisualizado / 7) * 100}%` }} />
              </div>
            </div>
            <span className="text-[9px] font-black text-slate-300 dark:text-white/30 uppercase leading-none italic whitespace-nowrap">
              {diaVisualizado === diaAtualDoSistema ? 'HOJE' : 'VISUALIZANDO'}
            </span>
          </div>
          <div className="flex justify-between items-center px-2">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const isToday = d === diaAtualDoSistema;
              return (
                <button
                  key={d}
                  onClick={() => { }} // Bloqueado
                  disabled={true}
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${diaVisualizado === d
                    ? 'bg-[#CCFF00] text-black shadow-[0_0_15px_rgba(204,255,0,0.6)] scale-110'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-zinc-500'
                    } ${!isToday ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                >
                  {d < diaAtualDoSistema && (
                    <div className="absolute -top-1 -right-1 bg-slate-400 rounded-full p-0.5 border-2 border-white dark:border-black opacity-50">
                      <Check size={8} className="text-white" strokeWidth={4} />
                    </div>
                  )}
                  <span className="text-[10px] font-black">{d}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Água - Compact Card */}
        <div className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-soft relative overflow-hidden group transition-all ${diaVisualizado !== diaAtualDoSistema ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-blue-500/10 dark:bg-blue-500/20 transition-all duration-1000 z-0 pointer-events-none"
            style={{ height: `${Math.min((dadosDoDia.totalAgua / 3000) * 100, 100)}%` }}
          />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Hidratação</h3>
                <span className="text-4xl font-black italic text-slate-900 dark:text-white leading-none tabular-nums">
                  {dadosDoDia.totalAgua}<span className="text-sm text-slate-400 ml-1">ml</span>
                </span>
              </div>
              <button onClick={clearAgua} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Undo size={16} /></button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => updateAgua(250)} className="flex-1 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-[#CCFF00] hover:text-black hover:border-[#CCFF00] rounded-2xl font-black text-[9px] uppercase transition-all">250ml</button>
              <button onClick={() => updateAgua(500)} className="flex-1 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-[#CCFF00] hover:text-black hover:border-[#CCFF00] rounded-2xl font-black text-[9px] uppercase transition-all">500ml</button>
              <button onClick={() => updateAgua(1000)} className="flex-1 py-4 bg-[#CCFF00] text-black rounded-2xl font-black text-[9px] uppercase shadow-lg shadow-[#CCFF00]/10 active:scale-95 transition-all">1L</button>
            </div>
          </div>
        </div>

        {/* Sono e Nutrição */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all ${diaVisualizado !== diaAtualDoSistema ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          {/* Sono Scorecard */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-soft flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sono (Horas)</h3>
              <span className={`text-2xl font-black italic ${dadosDoDia.sonoHoras < 5 ? 'text-red-500' : dadosDoDia.sonoHoras >= 8 ? 'text-[#CCFF00]' : 'text-slate-900 dark:text-white'}`}>
                {dadosDoDia.sonoHoras.toFixed(1)}h
              </span>
            </div>

            <input
              type="range" min="0" max="12" step="0.5"
              value={dadosDoDia.sonoHoras}
              onChange={(e) => syncWithServer({ sonoHoras: parseFloat(e.target.value) })}
              className="w-full h-3 bg-slate-100 dark:bg-black/20 rounded-full appearance-none accent-black dark:accent-white mb-4"
            />

            <div className="flex items-center justify-between px-2 py-2 bg-slate-50 dark:bg-black/20 rounded-xl">
              <span className="text-[9px] font-bold uppercase text-slate-400">Status</span>
              <span className="text-[10px] font-black uppercase">
                {dadosDoDia.sonoHoras < 5 ? <span className="text-red-500">Ruim (-4)</span> :
                  dadosDoDia.sonoHoras < 7 ? <span className="text-yellow-500">Médio (+3)</span> :
                    dadosDoDia.sonoHoras < 8 ? <span className="text-blue-500">Bom (+5)</span> :
                      <span className="text-[#CCFF00] dark:text-[#CCFF00]">Ótimo (+8)</span>}
              </span>
            </div>
          </div>

          {/* Nutrição Limpa */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-soft">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Nutrição Limpa</h3>
            <div className="flex gap-3 justify-between">
              {[
                { field: 'ateFrutas', emoji: '🍎' },
                { field: 'ateLegumes', emoji: '🥦' },
                { field: 'ateProteina', emoji: '🍗' },
              ].map(item => (
                <button
                  key={item.field}
                  onClick={() => syncWithServer({ [item.field]: !((dadosDoDia as any)[item.field]) })}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl border transition-all ${(dadosDoDia as any)[item.field]
                    ? 'bg-[#CCFF00] border-[#CCFF00] text-black shadow-md scale-105'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-50 grayscale'
                    }`}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
            {/* Diet Toggle Switch */}
            <div className="mt-6 flex items-center justify-between bg-slate-50 dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-white/5">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Fugi da Dieta hoje?</span>

              <button
                onClick={() => syncWithServer({ exagereiHoje: !dadosDoDia.exagereiHoje })}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${dadosDoDia.exagereiHoje ? 'bg-red-500' : 'bg-green-500/20'
                  }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${dadosDoDia.exagereiHoje ? 'translate-x-6' : 'translate-x-0'
                    }`}
                >
                  {dadosDoDia.exagereiHoje ? (
                    <AlertTriangle size={12} className="text-red-500" />
                  ) : (
                    <Check size={12} className="text-green-500" />
                  )}
                </div>
              </button>
            </div>

            {dadosDoDia.exagereiHoje && (
              <div className="mt-2 text-center animate-in fade-in slide-in-from-top-1">
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">-5 Pontos (Penalidade)</span>
              </div>
            )}
          </div>
        </div>

        {/* Registro de Atividade */}
        <div className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-soft transition-all ${diaVisualizado !== diaAtualDoSistema ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
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
              <div className="flex gap-4 justify-center w-full">
                <button
                  onClick={() => setSessionActivity(prev => ({ ...prev, saved: false }))}
                  className="text-[10px] font-black uppercase text-slate-400 underline hover:text-[#CCFF00]"
                >
                  Editar ou Corrigir
                </button>
                <button
                  onClick={deleteActivity}
                  className="group/trash p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  title="Excluir Atividade"
                >
                  <Trash2 size={16} className="text-slate-300 group-hover/trash:text-red-500 transition-colors" />
                </button>
              </div>
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
            <button onClick={() => window.location.href = "/team"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 hover:text-slate-900 dark:text-zinc-600 dark:hover:text-white transition-all group">
              <div className="group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter">Equipe</span>
            </button>
            <button onClick={() => window.location.href = "/history"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 hover:text-slate-900 dark:text-zinc-600 dark:hover:text-white transition-all group">
              <div className="group-hover:scale-110 transition-transform">
                <HistoryIcon size={24} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter">Histórico</span>
            </button>
            <button onClick={() => window.location.href = "/perfil"} className="flex-1 flex flex-col items-center gap-2 py-5 text-slate-400 hover:text-slate-900 dark:text-zinc-600 dark:hover:text-white transition-all group">
              <User size={28} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Perfil</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}