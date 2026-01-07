"use client"
import { useState } from "react"
import { Scale, Ruler, CircleUser, ChevronRight, Save } from "lucide-react"

export default function ProfilePage() {
    const [loading, setLoading] = useState(false)

    return (
        <div className="min-h-screen bg-black text-white pb-10">
            <header className="p-8 flex items-center justify-between max-w-xl mx-auto">
                <div>
                    <h2 className="text-3xl font-bold">Meu Perfil</h2>
                    <p className="text-zinc-500">Configure seus dados iniciais</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-black">
                    <CircleUser size={28} />
                </div>
            </header>

            <main className="px-6 max-w-xl mx-auto space-y-6">
                <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
                    <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-6">Bio Inicial</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-800 p-4 rounded-2xl">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <Scale size={16} /> <span className="text-xs font-bold uppercase">Peso</span>
                            </div>
                            <input type="number" placeholder="00.0" className="bg-transparent text-2xl font-bold outline-none w-full" />
                            <span className="text-zinc-600 text-xs font-bold">KG</span>
                        </div>

                        <div className="bg-zinc-800 p-4 rounded-2xl">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <Ruler size={16} /> <span className="text-xs font-bold uppercase">Altura</span>
                            </div>
                            <input type="number" placeholder="000" className="bg-transparent text-2xl font-bold outline-none w-full" />
                            <span className="text-zinc-600 text-xs font-bold">CM</span>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
                    <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-6">Medidas (CM)</h3>

                    <div className="space-y-3">
                        {["Cintura", "Peitoral", "Braço Esq.", "Braço Dir."].map((label) => (
                            <div key={label} className="flex items-center justify-between bg-zinc-800 p-4 rounded-2xl">
                                <span className="font-bold text-zinc-300">{label}</span>
                                <input type="number" className="bg-transparent text-right font-bold w-16 outline-none text-green-500" placeholder="0" />
                            </div>
                        ))}
                    </div>
                </div>

                <button className="w-full bg-white text-black font-black py-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all">
                    <Save size={20} />
                    SALVAR DADOS DE INÍCIO
                </button>
            </main>
        </div>
    )
}