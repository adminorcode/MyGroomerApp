import React, { createContext, useContext } from 'react'
import { lightColors, AppColors } from '../constants/theme'

type ThemeContextType = {
    colors: AppColors
    /** Always false — the product ships light-only; OS dark mode is ignored. */
    isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
    colors: lightColors,
    isDark: false,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <ThemeContext.Provider value={{ colors: lightColors, isDark: false }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
