export function LobbyGameSettingsBadges({ settings }: { settings: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 items-center w-full justify-center">
      {settings.map((setting) => (
        <div key={setting} className="badge badge-sm badge-outline">
          {setting}
        </div>
      ))}
    </div>
  )
}
