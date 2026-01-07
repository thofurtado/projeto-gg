"use client"
import { useState, useEffect } from "react"
import { CheckCircle2, Trophy, ArrowUpRight, ChevronLeft, Zap, Target } from "lucide-react"
import { toast } from "sonner"

export default function CheckinTreinoPage() {
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState("")
  const [metas, setMetas] = useState<any[]>([])
  const [realizado, setRealizado] = useState<any>({})
  const [diaAtual, setDiaAtual] = useState(1)

  useEffect(() => {
    setMounted(true)
    const user = localStorage.getItem("user_gg")
    if (!user) { window.location.href = "/"; return; }
    setUsername(user)

    const savedMetas = JSON.parse(localStorage.getItem(`metas_v2_${user}`) || "[]")
    setMetas(savedMetas)
    
    // Simulação de dia do projeto (Poderia vir do localStorage)
    setDiaAtual(1) 
  }, [])

  // FUNÇÃO MÁGICA: Calcula a meta sugerida para HOJE baseada no dia
  // Se ele começa com 1 e quer chegar em 10 em 30 dias:
  const calcularMetaHoje = (valorInicial: number, metaFinal: number) => {
    const progresso = (metaFinal - valorInicial) / 30 // Evolução gradual em 30 dias
    const metaHoje = valorInicial + (progresso * (diaAtual - 1))
    return Math.max(1, Math.round(metaHoje))
  }

  const handleFinalizarCheckin = () => {
    let totalPontos = 0
    
    metas.forEach(group => {
      group.exercises.forEach((ex: any) => {
        const valorReal = realizado[ex.name] || 0
        const metaSugerida = calcularMetaHoje(ex.current || 0, ex.target)

        if (valorReal >= metaSugerida) {
          totalPontos += 100 // Bateu a meta do dia
          const extras = valorReal - metaSugerida
          if (extras > 0) totalPontos += (extras * 2) // Bônus por superação
        } else {
          // Ganha pontos proporcionais se fez pelo menos algo
          totalPontos += Math.round((valorReal / metaSugerida) * 80)
        }
      })
    })

    const hoje = new Date().toISOString().split('T')[0]
    localStorage.setItem(`checkin_data_${username}_${hoje}`, JSON.stringify(realizado))
    
    // Salva os pontos no histórico global
    const pontosAntigos = parseInt(localStorage.getItem(`pontos_${username}`) || "0")
    localStorage.setItem(`pontos_${username}`, (pontosAntigos + totalPontos).toString())

    toast.success(`Treino Registrado! +${totalPontos} pontos ganhos.`)
    window.location.href = "/dashboard"
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-32">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => window.location.href = "/dashboard"} className="p-2 bg-zinc-900 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase italic leading-none">CHECK-IN <span className="text-green-500">DIÁRIO</span></h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Dia {diaAtual} de 120</p>
        </div>
      </header>

      <div className="space-y-6">
        {metas.map((group) => (
          <div key={group.id} className="bg-zinc-900 rounded-[32px] border border-zinc-800 p-6">
            <h3 className="text-green-500 font-black italic uppercase mb-6 flex items-center gap-2">
              <Zap size={18} /> {group.type}
            </h3>

            <div className="space-y-6">
              {group.exercises.map((ex: any, idx: number) => {
                const metaSugerida = calcularMetaHoje(ex.current || 0, ex.target)
                return (
                  <div key={idx} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-black uppercase text-sm italic">{ex.name}</p>
                        <p className="text-[10px] text-zinc-500 font-bold">Meta Sugerida: <span className="text-white">{metaSugerida} {ex.unit}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-tighter">Meta Final: {ex.target}</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="Quanto você fez?"
                        className="w-full bg-black border border-zinc-800 rounded-2xl p-5 outline-none focus:border-green-500 font-black text-xl transition-all"
                        value={realizado[ex.name] || ""}
                        onChange={(e) => setRealizado({...realizado, [ex.name]: parseFloat(e.target.value)})}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 font-black uppercase text-[10px]">
                        {ex.unit}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <button 
          onClick={handleFinalizarCheckin}
          className="w-full max-w-xl mx-auto bg-white text-black font-black py-6 rounded-3xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all text-lg"
        >
          REGISTRAR E GANHAR PONTOS <Trophy size={20} />
        </button>
      </div>
    </div>
  )
}