"use client"

import * as React from "react"

// Forçando tipo para sempre ser light, mas mantendo compatibilidade de tipo se algo checar "dark"
type Theme = "dark" | "light"

type ThemeContextType = {
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Estado fixo em light
    const theme: Theme = "light"

    React.useEffect(() => {
        // Ao montar, GARANTE que limpa qualquer classe dark residual do html
        // E remove do localStorage para evitar flashes futuros
        document.documentElement.classList.remove("dark")
        localStorage.removeItem("theme_gg")
    }, [])

    const toggleTheme = () => {
        // No-op: Função desabilitada
        console.log("Troca de tema desabilitada pelo administrador.")
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = React.useContext(ThemeContext)
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }
    return context
}
