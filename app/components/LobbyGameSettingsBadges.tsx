export function LobbyGameSettingsBadges({ settings }: { settings: string[] }) {
  return (
    <div className="flex flex-col flex-wrap sm:flex-row gap-2 items-center w-full justify-center">
      {settings.map((setting) => (
        <div className="badge badge-lg badge-neutral badge-outline badge-sm gap-2">
          {setting}
        </div>
      ))}
    </div>
  )
}
