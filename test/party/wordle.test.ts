import { describe, it, expect, beforeEach, vi } from "vitest"
import Server from "../../party/server"
import {
  MockRoom,
  MockConnection,
  createMockConnectionContext,
} from "../mocks/party"
import { GameState, GameMode, ServerMessageType } from "../../shared/types"
import { WordleGame } from "../../party/games/wordle"

// Mock DictionaryManager
vi.mock("../../party/dictionary", () => ({
  DictionaryManager: class {
    load = vi.fn().mockResolvedValue({ success: true })
    // Simple mock dictionary
    isWordValid = vi.fn().mockImplementation((word: string) => {
      return ["APPLE", "ALERT", "ADAPT", "ABUSE", "ARGUE"].includes(
        word.toUpperCase(),
      )
    })
    getRandomWord = vi.fn().mockReturnValue("APPLE") // Fixed target for stability
  },
}))

describe("Wordle Game Logic", () => {
  let room: MockRoom
  let server: Server

  beforeEach(() => {
    room = new MockRoom("test")
    room.storage.put("gameMode", GameMode.WORDLE)
    server = new Server(room as any)
    server.gameMode = GameMode.WORDLE

    server.logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any
  })

  const joinPlayer = async (id: string) => {
    const conn = new MockConnection(id)
    room.connections.set(id, conn as any)
    await server.onConnect(conn as any, createMockConnectionContext())
    return conn
  }

  it("should start game and pick target word", async () => {
    await joinPlayer("host")

    const game = new WordleGame(server)
    server.activeGame = game
    game.requestStartGame("host")

    expect(server.gameState).toBe(GameState.PLAYING)
    expect(game.targetWord).toBe("APPLE")
  })

  it("should handle valid guesses and updates state", async () => {
    await joinPlayer("host")
    const game = new WordleGame(server)
    server.activeGame = game
    game.requestStartGame("host")

    // "ALERT" vs "APPLE"
    // A (correct), L (present), E (present), R (absent), T (absent)
    // Wait: A P P L E
    //       A L E R T
    // A: match
    // L: in APPLE (pos 3), guess (pos 1). Present.
    // E: in APPLE (pos 4), guess (pos 2). Present.

    game.submitWord("host", "ALERT")

    expect(game.guesses.length).toBe(1)
    const guess = game.guesses[0]
    expect(guess.word).toBe("ALERT")
    expect(guess.results[0]).toBe("correct") // A
    expect(guess.results[1]).toBe("present") // L
    expect(guess.results[3]).toBe("absent") // R
  })

  it("should reject invalid dictionary words", async () => {
    const host = await joinPlayer("host")
    const game = new WordleGame(server)
    server.activeGame = game
    game.requestStartGame("host")

    game.submitWord("host", "ZZZZZ")

    expect(game.guesses.length).toBe(0)
    expect(host.send).toHaveBeenCalledWith(
      expect.stringContaining(ServerMessageType.ERROR),
    )
  })

  it("should detect win condition", async () => {
    await joinPlayer("host")
    const game = new WordleGame(server)
    server.activeGame = game
    game.requestStartGame("host")

    game.submitWord("host", "APPLE")

    expect(server.gameState).toBe(GameState.ENDED)
    expect(game.winnerId).toBe("host")
  })

  it("should end game on max attempts", async () => {
    await joinPlayer("host")
    const game = new WordleGame(server)
    server.activeGame = game
    game.requestStartGame("host")

    // Consume all attempts (default 5, defined in GAME_CONFIG)
    // We'll update settings to be safe or just loop 5 times
    game.maxAttempts = 2 // Shorten for test

    game.submitWord("host", "ABUSE") // 1
    expect(server.gameState).toBe(GameState.PLAYING)

    game.submitWord("host", "ADAPT") // 2

    expect(server.gameState).toBe(GameState.ENDED)
    expect(game.winnerId).toBeNull()
  })
})
