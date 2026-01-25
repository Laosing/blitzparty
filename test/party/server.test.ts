import { describe, it, expect, beforeEach, vi } from "vitest"
import Server from "../../party/server"
import {
  MockRoom,
  MockConnection,
  createMockConnectionContext,
  MockStorage,
} from "../mocks/party"
import { GameState, GameMode } from "../../shared/types"

// Mock DictionaryManager to avoid loading real dictionary files
vi.mock("../../party/dictionary", () => ({
  DictionaryManager: class {
    load = vi.fn().mockResolvedValue({ success: true })
    validate = vi.fn().mockReturnValue(true)
  },
}))

describe("PartyKit Server Smoke Tests", () => {
  let room: MockRoom
  let server: Server

  beforeEach(() => {
    room = new MockRoom("test")
    server = new Server(room as any)
    // Silence logger during tests
    server.logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any
  })

  it("should instantiate correctly", () => {
    expect(server).toBeInstanceOf(Server)
    expect(server.gameState).toBe(GameState.LOBBY)
  })

  it("should handle new connection", async () => {
    const conn = new MockConnection("user1")
    const ctx = createMockConnectionContext()

    await server.onConnect(conn as any, ctx)

    expect(server.players.has("user1")).toBe(true)
    expect(server.players.size).toBe(1)

    // First player should be admin
    expect(server.players.get("user1")?.isAdmin).toBe(true)
  })

  it("should remove player on disconnect", async () => {
    const conn = new MockConnection("user1")
    const ctx = createMockConnectionContext()
    await server.onConnect(conn as any, ctx)

    expect(server.players.size).toBe(1)

    await server.onClose(conn as any)
    expect(server.players.size).toBe(0)
  })

  it("should persist game mode on first connect", async () => {
    const conn = new MockConnection("user1")
    const ctx = createMockConnectionContext(
      "127.0.0.1",
      "http://localhost/party/room?mode=WORDLE",
    )

    await server.onConnect(conn as any, ctx)

    expect(server.gameMode).toBe(GameMode.WORDLE)
    expect(room.storage.data.get("gameMode")).toBe(GameMode.WORDLE)
  })
})
