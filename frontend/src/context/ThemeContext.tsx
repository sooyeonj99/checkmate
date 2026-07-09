import { createContext, useContext, ReactNode } from 'react'

interface ThemeContextType {
 theme: 'light'
 setTheme: (t: 'light') => void
 isDark: false
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', setTheme: () => {}, isDark: false })

export function ThemeProvider({ children }: { children: ReactNode }) {
 return (
 <ThemeContext.Provider value={{ theme: 'light', setTheme: () => {}, isDark: false }}>
 {children}
 </ThemeContext.Provider>
 )
}

export const useTheme = () => useContext(ThemeContext)
