import React, { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { lightColors, darkColors } from '../theme/colors'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  colors: typeof lightColors
  isDark: boolean
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  colors: lightColors,
  isDark: false,
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    AsyncStorage.getItem('cm_theme').then(v => {
      if (v === 'light' || v === 'dark' || v === 'system') setThemeState(v)
    })
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    AsyncStorage.setItem('cm_theme', t)
  }

  const isDark =
    theme === 'dark' ? true :
    theme === 'light' ? false :
    systemScheme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, colors: isDark ? darkColors : lightColors, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
