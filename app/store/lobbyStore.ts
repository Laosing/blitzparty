import { create } from "zustand"
import { GameMode } from "../../shared/types"

interface LobbyState {
  newRoomName: string
  roomPassword: string
  selectedMode: GameMode
  selectedRoomId: string | null
  passwordInput: string
  isPasswordModalOpen: boolean
  availableRooms: {
    id: string
    players: number
    isPrivate?: boolean
    mode?: GameMode
  }[]

  setNewRoomName: (name: string) => void
  setRoomPassword: (pass: string) => void
  setSelectedMode: (mode: GameMode) => void
  setSelectedRoomId: (id: string | null) => void
  setPasswordInput: (pass: string) => void
  setIsPasswordModalOpen: (isOpen: boolean) => void
  setAvailableRooms: (
    rooms: {
      id: string
      players: number
      isPrivate?: boolean
      mode?: GameMode
    }[],
  ) => void
  resetInputs: () => void
}

export const useLobbyStore = create<LobbyState>((set) => ({
  newRoomName: "",
  roomPassword: "",
  selectedMode: GameMode.BOMB_PARTY,
  selectedRoomId: null,
  passwordInput: "",
  isPasswordModalOpen: false,
  availableRooms: [],

  setNewRoomName: (name) => set({ newRoomName: name }),
  setRoomPassword: (pass) => set({ roomPassword: pass }),
  setSelectedMode: (mode) => set({ selectedMode: mode }),
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),
  setPasswordInput: (pass) => set({ passwordInput: pass }),
  setIsPasswordModalOpen: (isOpen) => set({ isPasswordModalOpen: isOpen }),
  setAvailableRooms: (rooms) => set({ availableRooms: rooms }),

  resetInputs: () => set({ newRoomName: "", roomPassword: "" }),
}))
