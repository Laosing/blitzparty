import clsx from "clsx"
import usePartySocket from "partysocket/react"
import { useEffect, useRef, useState } from "react"
import {
  ClientMessageType,
  GameMode,
  GameState,
  ServerMessageType,
} from "../../shared/types"
import type { Player } from "../../shared/types"
import { useMultiTabPrevention } from "../hooks/useMultiTabPrevention"
import { Logo } from "./Logo"
import { Modal } from "./Modal"
import BombPartyView from "./games/BombPartyView"
import BombPartySettings from "./games/BombPartySettings"
import WordleView from "./games/WordleView"
import WordleSettings from "./games/WordleSettings"

type ServerMessage = {
  type: string
  gameState?: GameState
  players?: Player[]
  gameMode?: GameMode
  chatEnabled?: boolean
  gameLogEnabled?: boolean
  // Allow other props
  [key: string]: any
}

function GameCanvasInner({
  room,
  password,
  initialMode,
}: {
  room: string
  password?: string | null
  initialMode?: string | null
}) {
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY)
  const [players, setPlayers] = useState<Player[]>([])
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.BOMB_PARTY)

  // Generic Server State (for game specific data)
  const [serverState, setServerState] = useState<any>({})

  const [logs, setLogs] = useState<{ message: string; timestamp: number }[]>([])
  const [gameLogEnabled, setGameLogEnabled] = useState(true)

  // Settings State (Buffered)
  const [pendingSettings, setPendingSettings] = useState<any>({})

  const openSettings = () => {
    setPendingSettings({
      chatEnabled,
      gameLogEnabled,
      ...serverState,
    })
    ;(
      document.getElementById("settings_modal") as HTMLDialogElement
    )?.showModal() // Explicitly open since we control logic
  }

  const saveSettings = () => {
    // Commit changes
    socket.send(
      JSON.stringify({
        type: ClientMessageType.UPDATE_SETTINGS,
        ...pendingSettings,
      }),
    )
    ;(document.getElementById("settings_modal") as HTMLDialogElement)?.close()
  }

  // Persistent name state (committed)
  const [myName, setMyName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("booombparty_username") || ""
    }
    return ""
  })

  // Input field for name modal
  const [nameInput, setNameInput] = useState(myName)

  // Sync input with localstorage name on mount/update
  useEffect(() => {
    setNameInput(myName)
  }, [myName])

  // Use stable initial name to prevent socket reconnection on name change
  const [initialName] = useState(myName)

  // Persistent Client ID
  const [clientId] = useState(() => {
    if (typeof window === "undefined") return "server"
    let id = localStorage.getItem("booombparty_client_id")
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("booombparty_client_id", id)
    }
    return id
  })

  const socket = usePartySocket({
    room: room,
    // Add name to query
    query: {
      ...(password ? { password } : {}),
      ...(initialMode ? { mode: initialMode } : {}),
      name: initialName,
      clientId,
    },
    onMessage(evt) {
      const data = JSON.parse(evt.data) as ServerMessage & {
        senderName?: string
        text?: string
      }
      handleMessage(data)
    },
    onClose(evt) {
      if (evt.code === 4000) {
        window.location.href = "/?error=password"
      }
      if (evt.code === 4001) {
        window.location.href = "/?error=inactivity"
      }
      if (evt.code === 4002) {
        window.location.href = "/?error=kicked"
      }
      if (evt.code === 4003) {
        window.location.href = "/?error=banned"
      }
    },
  })

  const [chatMessages, setChatMessages] = useState<
    { senderName: string; text: string; timestamp: number }[]
  >([])
  const [chatInput, setChatInput] = useState("")
  const [chatEnabled, setChatEnabled] = useState(true)

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatEndRef.current?.parentElement) {
      chatEndRef.current.parentElement.scrollTop =
        chatEndRef.current.parentElement.scrollHeight
    }
  }, [chatMessages])

  const handleMessage = (
    data: ServerMessage & { senderName?: string; text?: string },
  ) => {
    if (data.type === ServerMessageType.STATE_UPDATE) {
      if (data.gameState) setGameState(data.gameState)
      if (data.players) setPlayers(data.players)
      if (data.gameMode) {
        console.log("GameCanvas received mode:", data.gameMode)
        setGameMode(data.gameMode)
      }
      if (data.chatEnabled !== undefined) setChatEnabled(data.chatEnabled)
      if (data.gameLogEnabled !== undefined)
        setGameLogEnabled(data.gameLogEnabled)

      // Update full server state for game specific props
      setServerState((prev: any) => ({ ...prev, ...data }))
    } else if (data.type === ServerMessageType.ERROR) {
      if (!data.hide) {
        addLog(`Error: ${data.message}`)
      }
    } else if (data.type === ServerMessageType.BONUS) {
      addLog(`Bonus: ${data.message}`)
    } else if (data.type === ServerMessageType.EXPLOSION) {
      const pName =
        players.find((p) => p.id === data.playerId)?.name || "Unknown"
      addLog(`BOOM! Player: ${pName} lost a life!`)
    } else if (data.type === ServerMessageType.SYSTEM_MESSAGE) {
      addLog(`${data.message}`)
    } else if (data.type === ServerMessageType.VALID_WORD) {
      addLog(`${data.message}`)
    } else if (data.type === ServerMessageType.GAME_OVER) {
      if (data.winnerId) {
        const winnerName =
          players.find((p) => p.id === data.winnerId)?.name || data.winnerId
        addLog(`Game Over! Winner: ${winnerName}`)
      } else {
        addLog("Game Over!")
      }
    } else if (
      data.type === ServerMessageType.CHAT_MESSAGE &&
      data.senderName &&
      data.text
    ) {
      setChatMessages((prev) =>
        [
          ...prev,
          {
            senderName: data.senderName!,
            text: data.text!,
            timestamp: Date.now(),
          },
        ].slice(-100),
      )
    }
  }

  const addLog = (msg: string) => {
    setLogs((prev) =>
      [{ message: msg, timestamp: Date.now() }, ...prev].slice(0, 50),
    )
  }

  const handleSettingsUpdate = (updates: any) => {
    // Update pending settings locally
    setPendingSettings((prev: any) => ({ ...prev, ...updates }))
  }

  const handleKick = (playerId: string) => {
    if (!confirm("Are you sure you want to kick this player?")) return
    socket.send(
      JSON.stringify({ type: ClientMessageType.KICK_PLAYER, playerId }),
    )
  }

  const [isNameDisabled, setIsNameDisabled] = useState(false)
  const [isChatDisabled, setIsChatDisabled] = useState(false)

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    socket.send(
      JSON.stringify({ type: ClientMessageType.CHAT_MESSAGE, text: chatInput }),
    )
    setChatInput("")

    setIsChatDisabled(true)
    setTimeout(() => setIsChatDisabled(false), 1000)
  }

  const handleNameChange = () => {
    const trimmedName = nameInput.trim()
    if (!trimmedName) return
    setMyName(trimmedName) // Commit the new name
    localStorage.setItem("booombparty_username", trimmedName)
    socket.send(
      JSON.stringify({ type: ClientMessageType.SET_NAME, name: trimmedName }),
    )
    setIsNameDisabled(true)
    setTimeout(() => setIsNameDisabled(false), 5000)
  }

  const isAmAdmin = players.find((p) => p.id === socket.id)?.isAdmin

  return (
    <div className="container mx-auto p-4 flex flex-col gap-6 max-w-4xl">
      {/* Name Modal */}
      <Modal
        id="name_modal"
        title="Change Name"
        actions={
          <>
            <form method="dialog">
              <button className="btn btn-ghost">Cancel</button>
            </form>
            <button
              onClick={() => {
                handleNameChange()
                ;(
                  document.getElementById("name_modal") as HTMLDialogElement
                )?.close()
              }}
              disabled={isNameDisabled || !nameInput.trim()}
              className="btn btn-primary"
            >
              Save
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter your name"
            className="input input-bordered w-full text-center"
            maxLength={16}
          />
        </div>
      </Modal>

      {/* Settings Modal - Generic Shell */}
      <Modal
        id="settings_modal"
        title="Game Settings"
        actions={
          <>
            <form method="dialog">
              <button className="btn btn-ghost">Cancel</button>
            </form>
            <button className="btn btn-primary" onClick={saveSettings}>
              Save
            </button>
          </>
        }
      >
        <div className="form-control w-full max-w-xs mb-6 px-1">
          <label className="label cursor-pointer justify-start gap-4">
            <span className="label-text font-bold">Enable Chat</span>

            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={pendingSettings.chatEnabled ?? chatEnabled}
              onChange={(e) =>
                handleSettingsUpdate({ chatEnabled: e.target.checked })
              }
            />
          </label>
        </div>

        <div className="form-control w-full max-w-xs mb-6 px-1">
          <label className="label cursor-pointer justify-start gap-4">
            <span className="label-text font-bold">Enable Game Log</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={pendingSettings.gameLogEnabled ?? gameLogEnabled}
              onChange={(e) =>
                handleSettingsUpdate({ gameLogEnabled: e.target.checked })
              }
            />
          </label>
        </div>

        {/* Game Specific Settings */}
        {gameMode === GameMode.BOMB_PARTY && (
          <BombPartySettings
            startingLives={
              pendingSettings.startingLives ?? serverState.startingLives ?? 2
            }
            maxTimer={pendingSettings.maxTimer ?? serverState.maxTimer ?? 10}
            syllableChangeThreshold={
              pendingSettings.syllableChangeThreshold ??
              serverState.syllableChangeThreshold ??
              2
            }
            onUpdate={handleSettingsUpdate}
          />
        )}
        {gameMode === GameMode.WORDLE && (
          <WordleSettings
            maxTimer={pendingSettings.maxTimer ?? serverState.maxTimer ?? 10}
            maxAttempts={
              pendingSettings.maxAttempts ?? serverState.maxAttempts ?? 5
            }
            onUpdate={handleSettingsUpdate}
          />
        )}
      </Modal>

      {/* Game Content */}
      {gameMode === GameMode.WORDLE ? (
        <WordleView
          socket={socket}
          players={players}
          gameState={gameState}
          isAdmin={!!isAmAdmin}
          serverState={serverState}
          onKick={handleKick}
          onEditName={() =>
            (
              document.getElementById("name_modal") as HTMLDialogElement
            )?.showModal()
          }
          onOpenSettings={() =>
            (
              document.getElementById("settings_modal") as HTMLDialogElement
            )?.showModal()
          }
          room={room}
          password={password}
        />
      ) : gameMode === GameMode.BOMB_PARTY ? (
        <BombPartyView
          socket={socket}
          players={players}
          gameState={gameState}
          myId={socket.id}
          isAdmin={!!isAmAdmin}
          serverState={serverState}
          onKick={handleKick}
          onEditName={() =>
            (
              document.getElementById("name_modal") as HTMLDialogElement
            )?.showModal()
          }
          onOpenSettings={() =>
            (
              document.getElementById("settings_modal") as HTMLDialogElement
            )?.showModal()
          }
          room={room}
          password={password}
        />
      ) : (
        <div className="alert alert-error">Unknown Game Mode: {gameMode}</div>
      )}

      {/* Logs & Chat */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4`}>
        <div
          className={clsx(
            "card bg-base-100 p-4 h-48 shadow-lg",
            !gameLogEnabled && "opacity-25",
          )}
        >
          <h3 className="text-sm font-bold opacity-50 mb-2 uppercase tracking-wide">
            Game Log
          </h3>
          <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
            {gameLogEnabled &&
              logs.map((l, i) => (
                <div key={i} className="border-l-2 border-primary/20 pl-2">
                  <span className="opacity-50 mr-2">
                    {new Date(l.timestamp).toLocaleTimeString([], {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  {l.message}
                </div>
              ))}
          </div>
        </div>

        <div
          className={clsx(
            "card bg-base-100 p-4 h-48 shadow-lg flex flex-col",
            !chatEnabled && "opacity-25",
          )}
        >
          <h3 className="text-sm font-bold opacity-50 mb-2 uppercase tracking-wide">
            Chat
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 mb-2">
            {chatMessages.map((msg, i) => (
              <div key={i} className="text-sm">
                <span className="opacity-50 text-xs mr-2 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span className="font-bold opacity-70">{msg.senderName}:</span>{" "}
                <span className="opacity-90">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={chatEnabled ? "Message..." : "Chat Disabled"}
              className="input input-sm input-bordered flex-1"
              maxLength={100}
              disabled={!chatEnabled}
            />
            <button
              type="submit"
              className="btn btn-sm btn-ghost"
              disabled={isChatDisabled || !chatEnabled}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function GameCanvas({ room }: { room: string }) {
  const isBlocked = useMultiTabPrevention()
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [connectionPassword, setConnectionPassword] = useState<string | null>(
    null,
  )
  const [passwordInput, setPasswordInput] = useState("")
  const [initialMode, setInitialMode] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Check URL first
    const params = new URLSearchParams(window.location.search)
    const urlPwd = params.get("password")
    const urlMode = params.get("mode")

    if (urlMode) setInitialMode(urlMode)

    // We don't set initialMode here if it's missing; we wait for room check
    // if (urlMode) {
    //   setInitialMode(urlMode)
    // }

    if (urlPwd) {
      setConnectionPassword(urlPwd)
      setCheckingStatus(false)
      return
    }

    // Check room status
    fetch(`/parties/main/${room}`)
      .then((res) => {
        if (res.status === 403) {
          window.location.href = "/?error=banned"
          throw new Error("Banned")
        }
        if (res.ok) return res.json()
        throw new Error("Room not found")
      })
      .then((data: any) => {
        if (data.isPrivate) {
          setNeedsPassword(true)
        }
        if (data.mode) {
          setInitialMode(data.mode)
        }
        setCheckingStatus(false)
      })
      .catch((e) => {
        if (e.message !== "Banned") {
          // Room might not exist or be empty, just proceed to join
          setCheckingStatus(false)
        }
      })
  }, [room])

  if (isBlocked) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="alert alert-warning shadow-lg max-w-md mx-auto mt-10">
          <div>
            <h3 className="font-bold">Multiple Tabs Detected</h3>
            <div className="text-xs">
              You already have this game open in another tab. Please use that
              tab to play.
            </div>
            <button
              className="btn btn-sm btn-ghost mt-2"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (checkingStatus) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (needsPassword && !connectionPassword) {
    return (
      <div className="container mx-auto p-4 flex flex-col gap-6 max-w-md mt-10">
        <div className="card bg-base-100 shadow-xl p-6 text-center border border-base-300">
          <Logo name={room} random={false} />
          <p className="mt-4 mb-2">This room is private.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (passwordInput) setConnectionPassword(passwordInput)
            }}
            className="flex flex-col gap-2"
          >
            <input
              type="password"
              placeholder="Enter Password"
              className="input input-bordered w-full text-center"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary w-full">
              Join Room
            </button>
          </form>
          <a href="/" className="btn btn-ghost btn-sm mt-4">
            Back to Lobby
          </a>
        </div>
      </div>
    )
  }

  if (!/^[a-z]{4}$/.test(room)) {
    return (
      <div className="container mx-auto p-4 flex flex-col gap-6 max-w-md mt-10">
        <div className="card bg-base-100 shadow-xl p-6 text-center border border-base-300">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold mb-2">Invalid Room ID</h2>
          <p className="opacity-70 mb-4">
            Room codes must be exactly 4 letters (a-z).
          </p>
          <a href="/" className="btn btn-primary">
            Back to Lobby
          </a>
        </div>
      </div>
    )
  }

  if (!initialMode) {
    return (
      <div className="container mx-auto p-4 flex flex-col gap-6 max-w-md mt-10">
        <div className="card bg-base-100 shadow-xl p-6 text-center border border-base-300">
          <div className="text-4xl mb-4">❓</div>
          <h2 className="text-xl font-bold mb-2">Game Mode Required</h2>
          <p className="opacity-70 mb-4">
            You are trying to create a new room without specifying a game mode.
          </p>
          <a href="/" className="btn btn-primary">
            Back to Lobby
          </a>
        </div>
      </div>
    )
  }

  return (
    <GameCanvasInner
      room={room}
      password={connectionPassword}
      initialMode={initialMode}
    />
  )
}
