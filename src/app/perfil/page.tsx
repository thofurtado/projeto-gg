"use client"
import { useState, useEffect, useRef } from "react"
import { Save, Dumbbell, Trophy, ArrowRight, Plus, Minus, Droplets, Ruler, Weight, Loader2, Home, Activity, User, History, Sun, Moon } from "lucide-react"
import { toast } from "sonner"
import { storage } from "@/lib/storage"
import { useTheme } from "@/components/theme-provider"

// ... (imports remain)

export default function ProfilePage() {
    const [mounted, setMounted] = useState(false)
    const [username, setUsername] = useState("")
    const [loading, setLoading] = useState(true)
    const { theme, toggleTheme } = useTheme()

    const [formData, setFormData] = useState({
        weight: 80.0,
        height: 170.0,
        waist: 90.0,
        chest: 100.0,
        bicepL: 35.0,
        bicepR: 35.0,
        waterMeta: 3000
    })

    const [history, setHistory] = useState<any[]>([])

    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const initProfile = async () => {
            if (typeof window === 'undefined') return

            const user = localStorage.getItem("user_gg")
            if (!user) {
                window.location.href = "/"
                return
            }
            setUsername(user)

            // Fetch Data from Neon
            try {
                const res = await fetch(`/api/user/register?username=${user}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.found && data.history && data.history.length > 0) {
                        const latest = data.history[0]
                        setFormData({
                            weight: latest.weight || 80.0,
                            height: latest.height || 170.0,
                            waist: latest.waist || 90.0,
                            chest: latest.chest || 100.0,
                            bicepL: latest.bicepL || 35.0,
                            bicepR: latest.bicepR || 35.0,
                            waterMeta: data.user.waterGoal || 3000
                        })
                        setHistory(data.history)
                    } else {
                        // Fallback local storage if no server data
                        const local = await storage.get(`bio_${user}`)
                        if (local) setFormData(prev => ({ ...prev, ...local }))
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar perfil")
            } finally {
                setLoading(false)
                setMounted(true)
            }
        }
        initProfile()
    }, [])

    const updateValue = (key: string, step: number) => {
        setFormData(prev => {
            const val = Number((prev as any)[key]) || 0
            return { ...prev, [key]: Math.max(0, parseFloat((val + step).toFixed(1))) }
        })
    }

    const startHold = (key: string, step: number) => {
        stopHold()
        updateValue(key, step)
        let speed = 200
        const run = () => {
            updateValue(key, step)
            speed = Math.max(30, speed * 0.85)
            timerRef.current = setTimeout(run, speed)
        }
        timerRef.current = setTimeout(run, 500)
    }

    const stopHold = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            // Conversão de Dados: Numérica e Segura
            const payload = {
                username,
                weight: formData.weight ? parseFloat(String(formData.weight)) : 0,
                height: formData.height ? parseFloat(String(formData.height)) : 0,
                waist: formData.waist ? parseFloat(String(formData.waist)) : null,
                chest: formData.chest ? parseFloat(String(formData.chest)) : null,
                bicepL: formData.bicepL ? parseFloat(String(formData.bicepL)) : null,
                bicepR: formData.bicepR ? parseFloat(String(formData.bicepR)) : null,
                waterMeta: formData.waterMeta ? parseInt(String(formData.waterMeta)) : 3000
            }

            // Debug Payload
            console.log("Enviando Payload:", payload)

            const res = await fetch('/api/user/biometrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            // 1. Debug de Resposta: Captura Texto Bruto
            const rawText = await res.text()

            if (!res.ok) {
                console.error('Erro Real do Servidor:', rawText)
                try {
                    const errJson = JSON.parse(rawText)
                    throw new Error(errJson.error || errJson.details || rawText)
                } catch (e) {
                    throw new Error(`Erro Fatal: ${rawText}`)
                }
            }

            // Sucesso: Parse Seguro
            const data = JSON.parse(rawText)

            if (data.history) setHistory(data.history)

            // Backup Local
            await storage.save(`bio_${username}`, formData)

            toast.success("Evolução registrada com sucesso!")

            // Redireciona sempre, independente se é o primeiro registro ou atualização
            setTimeout(() => {
                window.location.href = "/dashboard"
            }, 1000)

        } catch (err: any) {
            console.error("Erro handleSave:", err)
            toast.error(`Falha: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center">
                <Loader2 className="text-[#CCFF00] animate-spin" size={32} />
            </div>
        )
    }

    const Control = ({ field, step, label, unit, icon: Icon, isSmall = false }: any) => (
        <div className={`bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-4 rounded-[2rem] flex items-center justify-between shadow-soft ${isSmall ? 'py-4' : 'py-6'}`}>
            <button
                type="button"
                onTouchStart={() => startHold(field, -step)} onTouchEnd={stopHold}
                onMouseDown={() => startHold(field, -step)} onMouseUp={stopHold} onMouseLeave={stopHold}
                className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl active:bg-red-500 active:text-white transition-all shrink-0 shadow-sm hover:bg-slate-200 dark:hover:bg-zinc-700"
            >
                <Minus size={20} />
            </button>

            <div className="flex flex-col items-center flex-1 px-2">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-widest flex items-center gap-1.5 leading-none mb-1">
                    {Icon && <Icon size={12} />} {label}
                </span>
                <input
                    type="number"
                    step={step}
                    value={(formData as any)[field]}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData(prev => ({ ...prev, [field]: isNaN(val) ? 0 : parseFloat(val.toFixed(1)) }));
                    }}
                    className={`w-full bg-transparent border-none text-center outline-none ${isSmall ? 'text-2xl' : 'text-4xl'} font-black italic text-slate-900 dark:text-white p-0 leading-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
                <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-600 uppercase mt-1">{unit}</span>
            </div>

            <button
                type="button"
                onTouchStart={() => startHold(field, step)} onTouchEnd={stopHold}
                onMouseDown={() => startHold(field, step)} onMouseUp={stopHold} onMouseLeave={stopHold}
                className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl active:bg-[#CCFF00] active:text-black transition-all shrink-0 shadow-sm hover:bg-slate-200 dark:hover:bg-zinc-700"
            >
                <Plus size={20} />
            </button>
        </div>
    )

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white font-sans selection:bg-[#CCFF00]/30 antialiased transition-colors duration-300`}>
            {/* ... HEADER ... */}
            <header className="p-5 flex justify-between items-center bg-white/80 dark:bg-black/80 backdrop-blur-3xl border-b border-slate-200 dark:border-zinc-900 sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#CCFF00] rounded-2xl flex items-center justify-center text-black font-black italic shadow-lg shadow-[#CCFF00]/20 active:scale-95 transition-all">GG</div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">Perfil Operacional</span>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase mt-1 tracking-widest italic">{username}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggleTheme} className="p-3 bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 rounded-xl transition-all border border-slate-200 dark:border-zinc-800 hover:text-[#CCFF00]">
                        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                    <button onClick={handleSave} className="p-3 bg-[#CCFF00] text-black rounded-xl hover:scale-105 active:scale-90 transition-all shadow-md shadow-[#CCFF00]/10 flex items-center gap-2">
                        <Save size={18} />
                        <span className="text-[10px] font-black uppercase hidden sm:inline">Salvar</span>
                    </button>
                </div>
            </header>

            <main className="max-w-[600px] mx-auto p-6 lg:p-10 pb-32">
                <div className="space-y-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 px-1">
                            <div className="w-1.5 h-4 bg-[#CCFF00] rounded-full" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Status Biométrico</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Control field="weight" step={0.1} label="Peso Atual" unit="kg" />
                            <Control field="height" step={0.1} label="Estatura" unit="cm" />
                        </div>

                        {/* Meta de Hidratação Card */}
                        <div className="bg-white dark:bg-blue-600/5 border border-slate-200 dark:border-blue-500/10 p-6 rounded-[3rem] shadow-soft relative overflow-hidden group flex items-center justify-between">
                            <div className="absolute -right-6 -top-6 opacity-[0.03] dark:opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                                <Droplets size={160} />
                            </div>

                            <button
                                onTouchStart={() => startHold('waterMeta', -100)} onTouchEnd={stopHold}
                                onMouseDown={() => startHold('waterMeta', -100)} onMouseUp={stopHold} onMouseLeave={stopHold}
                                className="w-14 h-14 relative z-10 bg-slate-50 dark:bg-zinc-900 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 flex items-center justify-center active:bg-blue-500 active:text-white transition-all shrink-0 shadow-sm hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                                <Minus size={24} />
                            </button>

                            <div className="flex flex-col items-center relative z-10 flex-1 px-4">
                                <span className="text-blue-500 text-[10px] font-black uppercase mb-1 flex items-center gap-2 italic tracking-[0.2em]">
                                    <Droplets size={16} /> Meta
                                </span>
                                <input
                                    type="number"
                                    step="100"
                                    value={formData.waterMeta}
                                    onChange={(e) => setFormData(prev => ({ ...prev, waterMeta: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-transparent border-none text-center outline-none text-5xl font-black italic text-slate-900 dark:text-white leading-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none tabular-nums"
                                />
                                <p className="text-[10px] font-bold text-blue-500/50 uppercase mt-1 tracking-widest">Mililitros</p>
                            </div>

                            <button
                                onTouchStart={() => startHold('waterMeta', 100)} onTouchEnd={stopHold}
                                onMouseDown={() => startHold('waterMeta', 100)} onMouseUp={stopHold} onMouseLeave={stopHold}
                                className="w-14 h-14 relative z-10 bg-slate-50 dark:bg-zinc-900 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 flex items-center justify-center active:bg-blue-500 active:text-white transition-all shrink-0 shadow-sm hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                                <Plus size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 px-1">
                            <div className="w-1.5 h-4 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Medidas Corporais</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Control field="waist" step={0.1} label="Cintura" unit="cm" isSmall icon={Ruler} />
                            <Control field="chest" step={0.1} label="Peitoral" unit="cm" isSmall />
                            <Control field="bicepL" step={0.1} label="Bíceps Esq." unit="cm" isSmall />
                            <Control field="bicepR" step={0.1} label="Bíceps Dir." unit="cm" isSmall />
                        </div>

                        <button onClick={handleSave} className="w-full bg-[#CCFF00] text-black py-6 rounded-[2.2rem] font-black text-sm uppercase flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-[#CCFF00]/10 group mt-6 hover:shadow-[#CCFF00]/20 hover:scale-[1.02]">
                            Registrar Nova Evolução <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Histórico Visual */}
                    {history.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-2 px-1">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Histórico Recente</h2>
                            </div>
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-4 space-y-2 max-h-60 overflow-y-auto shadow-inner custom-scrollbar">
                                {history.map((h: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black/20 rounded-2xl hover:bg-slate-100 transition-colors">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <div className="w-2 h-2 bg-[#CCFF00] rounded-full" />
                                            {new Date(h.date).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-4 items-center">
                                            <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{h.weight}kg</span>
                                            {h.waist && <span className="text-[10px] font-bold text-slate-400 tabular-nums border-l border-slate-200 pl-3">{h.waist}cm</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}