"use client"

import * as React from "react"

type Theme = "dark" | "light"

type ThemeContextType = {
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = React.useState<Theme>("light")

    React.useEffect(() => {
        // REQUISITO: Padrão Light (ignorar sistema operacional)
        // Verifica apenas se o usuário já salvou 'dark' explicitamente
        const saved = localStorage.getItem("theme_gg") as Theme

        if (saved === "dark") {
            setTheme("dark")
            document.documentElement.classList.add("dark")
        } else {
            // Se não tiver salvo ou se for 'light', força Light
            setTheme("light")
            document.documentElement.classList.remove("dark")
        }
    }, [])

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light"
        setTheme(newTheme)
        localStorage.setItem("theme_gg", newTheme)

        // Atualização imediata do DOM para refletir na UI
        if (newTheme === "dark") {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
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
