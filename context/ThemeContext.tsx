import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'ruggedin_theme';

export type Colors = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentActiveBg: string;
  successBg: string;
  techniqueText: string;
};

export const darkColors: Colors = {
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  surfaceElevated: '#141414',
  border: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
  accent: '#E8533A',
  accentBg: '#E8533A22',
  accentBorder: '#E8533A44',
  accentActiveBg: '#2a1210',
  successBg: '#1a3a1a',
  techniqueText: '#aaaaaa',
};

export const lightColors: Colors = {
  bg: '#f4f4f4',
  surface: '#ffffff',
  surfaceElevated: '#eeeeee',
  border: '#e0e0e0',
  text: '#111111',
  textSecondary: '#555555',
  textMuted: '#999999',
  accent: '#E8533A',
  accentBg: '#E8533A15',
  accentBorder: '#E8533A55',
  accentActiveBg: '#fde8e4',
  successBg: '#e8f5e9',
  techniqueText: '#444444',
};

type ThemeContextValue = {
  isDark: boolean;
  colors: Colors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  colors: darkColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then(value => {
      if (value !== null) setIsDark(value === 'dark');
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await SecureStore.setItemAsync(THEME_KEY, next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
