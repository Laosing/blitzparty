import { useLobbyStore } from "../../store/lobbyStore"
import { getGameModeName } from "../../utils"
import { CustomAvatar } from "../Logo"
import { LockIcon } from "../Icons"
import { useNavigate } from "@tanstack/react-router"

export default function RoomList() {
  const navigate = useNavigate()
  const availableRooms = useLobbyStore((state) => state.availableRooms)

  // Actions
  const setSelectedRoomId = useLobbyStore((state) => state.setSelectedRoomId)
  const setPasswordInput = useLobbyStore((state) => state.setPasswordInput)
  const setIsPasswordModalOpen = useLobbyStore(
    (state) => state.setIsPasswordModalOpen,
  )

  const handleRoomClick = (r: {
    id: string
    players: number
    isPrivate?: boolean
    mode?: any
  }) => {
    if (r.isPrivate) {
      setSelectedRoomId(r.id)
      setPasswordInput("")
      setIsPasswordModalOpen(true)
    } else {
      navigate({
        to: `/${r.id}`,
        search: { mode: r.mode },
      })
    }
  }

  return (
    <div className="text-left w-full">
      <h3 className="text-xl font-bold mb-4">
        Active Rooms ({availableRooms.length})
      </h3>

      {availableRooms.length === 0 && (
        <p className="text-center opacity-50 py-8">
          No active games found. Be the first to start one!
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableRooms.map((r) => (
          <div
            key={r.id}
            onClick={() => handleRoomClick(r)}
            className="card card-side bg-base-100 shadow-sm cursor-pointer hover:bg-base-200 transition-colors"
          >
            <figure>
              <CustomAvatar name={r.id} className="p-4 w-24 h-24" />
            </figure>
            <div className="card-body">
              <h2 className="card-title uppercase font-bold">
                {r.id} {r.isPrivate && <LockIcon />}
              </h2>
              <div className="card-actions">
                <div className="badge badge-primary">
                  {r.players} Player{r.players !== 1 ? "s" : ""}
                </div>
                <div className="badge badge-primary">
                  {getGameModeName(r.mode)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
