import { useEffect } from "react"
import { getThemeGradient, THEMES } from "../config"
import { useThemeStore } from "../store/themeStore"

export function ThemeBackground() {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    // Load saved theme on mount
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme)
    } else {
      document.documentElement.setAttribute("data-theme", "light")
    }
  }, [])

  return (
    <div
      className="fixed inset-0 h-full w-full -z-1 transition-all duration-700 ease-in-out"
      style={{
        backgroundImage: getThemeGradient(theme),
      }}
    ></div>
  )
}

export function ThemeController() {
  const theme = useThemeStore((state) => state.theme)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    useThemeStore.setState({ theme: val as (typeof THEMES)[number] })
    document.documentElement.setAttribute("data-theme", val)
  }

  return (
    <>
      <select
        className="select select-bordered select-sm capitalize"
        value={theme}
        onChange={handleChange}
      >
        <option disabled>Pick a theme</option>
        {THEMES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </>
  )
}
