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
        // Check local storage or system preference on mount
        const saved = localStorage.getItem("theme_gg") as Theme
        if (saved) {
            setTheme(saved)
            document.documentElement.classList.toggle("dark", saved === "dark")
        } else {
            // Default to Light as requested
            setTheme("light")
            document.documentElement.classList.remove("dark")
        }
    }, [])

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light"
        setTheme(newTheme)
        localStorage.setItem("theme_gg", newTheme)
        document.documentElement.classList.toggle("dark", newTheme === "dark")
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
