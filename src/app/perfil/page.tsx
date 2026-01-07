"use client"
import { useState, useEffect, useRef } from "react"
import { Save, Dumbbell, Trophy, ArrowRight, Plus, Minus, Droplets, Ruler, Weight } from "lucide-react"
import { toast } from "sonner"
import { storage } from "@/lib/storage"

export default function ProfilePage() {
    const [mounted, setMounted] = useState(false)
    const [username, setUsername] = useState("")
    const [formData, setFormData] = useState({
        weight: 80, height: 170, waist: 90, chest: 100, armL: 35, armR: 35, waterMeta: 3000
    })

    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const initProfile = async () => {
            setMounted(true)
            const user = localStorage.getItem("user_gg")
            if (!user) { 
                window.location.href = "/" 
            } else {
                setUsername(user)
                const saved = await storage.get(`perfil_${user}`)
                if (saved) {
                    setFormData(saved.ultimoRegistro || saved)
                } else {
                    const legacy = await storage.get(`bio_${user}`)
                    if (legacy) setFormData(legacy)
                }
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
        let speed = key === 'weight' ? 120 : 200
        const run = () => {
            updateValue(key, step)
            speed = Math.max(key === 'weight' ? 15 : 30, speed * 0.80)
            timerRef.current = setTimeout(run, speed)
        }
        timerRef.current = setTimeout(run, key === 'weight' ? 250 : 400)
    }

    const stopHold = () => { 
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }

    const handleSave = async () => {
        const timestamp = new Date().toISOString()
        
        const savedProfile = await storage.get(`perfil_${username}`)
        let profileData = savedProfile ? savedProfile : {
            username,
            historico: [],
            config: { waterMeta: formData.waterMeta }
        }

        const novoRegistro = { data: timestamp, ...formData }
        profileData.ultimoRegistro = novoRegistro
        profileData.historico.push(novoRegistro)
        profileData.config.waterMeta = formData.waterMeta

        await storage.save(`perfil_${username}`, profileData)
        await storage.save(`bio_${username}`, formData)
        
        const localPlano = localStorage.getItem(`plano_120_dias_${username}`)
        if (localPlano) {
            try {
                const planoObj = JSON.parse(localPlano)
                await storage.save(`plano_120_dias_${username}`, planoObj)
            } catch (e) {
                console.error("Erro ao sincronizar plano local")
            }
        }

        localStorage.setItem(`first_setup_${username}`, "done")
        
        toast.success("Dados salvos! Vamos configurar seu treino.")
        window.location.href = "/config-treino"
    }

    if (!mounted) return null

    const Control = ({ field, step, label, unit, icon: Icon, isSmall = false }: any) => (
        <div className={`bg-zinc-900/50 border border-zinc-800 p-3 rounded-[2rem] flex flex-col items-center justify-center ${isSmall ? 'py-2' : 'py-4'}`}>
            <span className="text-[9px] font-black uppercase text-zinc-500 mb-2 tracking-widest flex items-center gap-1">
                {Icon && <Icon size={10} />} {label}
            </span>
            <div className="flex items-center gap-4">
                <button onMouseDown={() => startHold(field, -step)} onMouseUp={stopHold} onMouseLeave={stopHold} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full active:bg-red-500 transition-colors shrink-0">
                    <Minus size={14} />
                </button>
                <div className="flex flex-col items-center min-w-[70px]">
                    <span className={`${isSmall ? 'text-xl' : 'text-3xl'} font-black italic text-white`}>{(formData as any)[field]}</span>
                    <span className="text-[8px] font-bold text-zinc-600 uppercase">{unit}</span>
                </div>
                <button onMouseDown={() => startHold(field, step)} onMouseUp={stopHold} onMouseLeave={stopHold} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full active:bg-green-500 transition-colors shrink-0">
                    <Plus size={14} />
                </button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-green-500/30 overflow-x-hidden">
            <header className="p-4 flex justify-between items-center border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-black font-black italic shadow-lg shadow-green-500/20">GG</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Bio // {username}</span>
                </div>
                <button onClick={handleSave} className="p-2 bg-green-500 text-black rounded-lg hover:scale-105 transition-transform"><Save size={18} /></button>
            </header>

            <main className="max-w-4xl mx-auto p-4 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-start">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Weight size={14} className="text-green-500" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Dados Vitais</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Control field="weight" step={0.1} label="Peso" unit="kg" />
                            <Control field="height" step={1} label="Altura" unit="cm" />
                        </div>
                        <div className="bg-blue-600/5 border border-blue-500/10 p-5 rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                <Droplets size={120} />
                            </div>
                            <span className="text-blue-400 text-[10px] font-black uppercase mb-4 flex items-center gap-2 italic tracking-widest">
                                <Droplets size={14} /> Meta de Hidratação
                            </span>
                            <div className="flex items-center justify-center gap-4">
                                <button onMouseDown={() => startHold('waterMeta', -50)} onMouseUp={stopHold} onMouseLeave={stopHold} className="w-12 h-12 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center active:bg-blue-500 active:text-black transition-all shrink-0"><Minus size={20} /></button>
                                <div className="text-center w-[120px]">
                                    <span className="text-5xl font-black italic text-white leading-none inline-block">
                                        {formData.waterMeta.toString().padStart(4, '0')}
                                    </span>
                                    <p className="text-[9px] font-bold text-blue-500/50 uppercase mt-1">Mililitros / Dia</p>
                                </div>
                                <button onMouseDown={() => startHold('waterMeta', 50)} onMouseUp={stopHold} onMouseLeave={stopHold} className="w-12 h-12 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center active:bg-blue-500 active:text-black transition-all shrink-0"><Plus size={20} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Ruler size={14} className="text-zinc-500" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Medidas Corporais</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Control field="waist" step={1} label="Cintura" unit="cm" isSmall />
                            <Control field="chest" step={1} label="Peitoral" unit="cm" isSmall />
                            <Control field="armL" step={0.5} label="Braço Esq." unit="cm" isSmall />
                            <Control field="armR" step={0.5} label="Braço Dir." unit="cm" isSmall />
                        </div>
                        <button onClick={handleSave} className="w-full bg-zinc-100 text-black py-5 rounded-[2rem] font-black text-xs uppercase flex items-center justify-center gap-3 hover:bg-green-500 transition-all group mt-2">
                            Próximo Passo <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}