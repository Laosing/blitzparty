import { create } from "zustand"
import { persist } from "zustand/middleware"
import { STORAGE_KEYS } from "../config"
import { THEMES } from "../config"

interface ThemeStore {
  theme: (typeof THEMES)[number]
  setTheme: (theme: (typeof THEMES)[number]) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: THEMES[0],
      setTheme: (theme: (typeof THEMES)[number]) => set({ theme }),
    }),
    {
      name: STORAGE_KEYS.THEME,
    },
  ),
)
