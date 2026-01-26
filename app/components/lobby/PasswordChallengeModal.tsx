import { useLobbyStore } from "../../store/lobbyStore"
import { Modal } from "../Modal"
import { useNavigate } from "@tanstack/react-router"

export default function PasswordChallengeModal() {
  const navigate = useNavigate()

  // State
  const isOpen = useLobbyStore((state) => state.isPasswordModalOpen)
  const passwordInput = useLobbyStore((state) => state.passwordInput)
  const selectedRoomId = useLobbyStore((state) => state.selectedRoomId)
  const availableRooms = useLobbyStore((state) => state.availableRooms)

  // Actions
  const setPasswordInput = useLobbyStore((state) => state.setPasswordInput)
  const setIsPasswordModalOpen = useLobbyStore(
    (state) => state.setIsPasswordModalOpen,
  )

  const handleJoin = () => {
    if (selectedRoomId && passwordInput) {
      const room = availableRooms.find((r) => r.id === selectedRoomId)
      navigate({
        to: `/${selectedRoomId}`,
        search: { mode: room?.mode, password: passwordInput },
      })
      setIsPasswordModalOpen(false) // Close on navigate? or wait? usually navigate unmounts Lobby
    }
  }

  return (
    <Modal
      title={`Enter password for ${selectedRoomId?.toUpperCase()}`}
      onActionClick={handleJoin}
      onActionText="Join"
      isOpen={isOpen}
      onClose={() => setIsPasswordModalOpen(false)}
    >
      <input
        type="password"
        value={passwordInput}
        onChange={(e) => setPasswordInput(e.target.value)}
        placeholder="Password"
        className="input input-bordered w-full"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleJoin()
        }}
      />
    </Modal>
  )
}
