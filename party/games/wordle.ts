import { BaseGame } from "../game-engine"
import {
  ClientMessageType,
  GameState,
  ServerMessageType,
} from "../../shared/types"
import type * as Party from "partykit/server"
import type { ClientMessage, Guess, GuessResult } from "../../shared/types"

export class WordleGame extends BaseGame {
  targetWord: string = ""
  guesses: Guess[] = []

  activePlayerId: string | null = null
  turnStartTime: number = 0
  timer: number = 0
  maxTimer: number = 10
  maxAttempts: number = 5

  private tickInterval: ReturnType<typeof setTimeout> | null = null
  private nextTickTime: number = 0

  constructor(server: any) {
    super(server)
  }

  onStart(): void {
    if (this.players.size < 1) return
    if (!this.server.dictionaryReady) {
      this.broadcast({
        type: ServerMessageType.ERROR,
        message: "Dictionary not loaded!",
      })
      return
    }

    this.server.gameState = GameState.PLAYING
    this.guesses = []

    // Pick target word
    try {
      this.targetWord = this.server.dictionary.getRandomWord(5)
    } catch (e) {
      this.broadcast({
        type: ServerMessageType.ERROR,
        message: "Failed to pick word",
      })
      this.endGame()
      return
    }

    this.startLoop()
    this.nextTurn(true)

    this.broadcast({
      type: ServerMessageType.SYSTEM_MESSAGE,
      message: "Wordle Game Started! Guess the 5-letter word.",
    })
  }

  onTick(): void {
    if (this.server.gameState !== GameState.PLAYING) return

    this.timer -= 1
    this.broadcast({ type: ServerMessageType.STATE_UPDATE, timer: this.timer })

    if (this.timer <= 0) {
      this.handleTimeout()
    }
  }

  startLoop() {
    if (this.tickInterval) clearTimeout(this.tickInterval)
    this.nextTickTime = Date.now() + 1000
    this.tickInterval = setTimeout(() => this.loopStep(), 1000)
  }

  loopStep() {
    if (this.server.gameState !== GameState.PLAYING) return

    const now = Date.now()
    const drift = now - this.nextTickTime
    if (drift > 1000) this.nextTickTime = now

    this.onTick()

    this.nextTickTime += 1000
    const delay = Math.max(0, this.nextTickTime - Date.now())
    this.tickInterval = setTimeout(() => this.loopStep(), delay)
  }

  handleTimeout() {
    // Pass turn
    this.broadcast({
      type: ServerMessageType.SYSTEM_MESSAGE,
      message: "Time's up! Next player.",
    })
    this.nextTurn()
  }

  nextTurn(isFirst: boolean = false) {
    if (this.server.gameState !== GameState.PLAYING) return

    const playerIds = Array.from(this.players.keys())
    if (playerIds.length === 0) {
      this.endGame()
      return
    }

    if (isFirst) {
      this.activePlayerId = playerIds[0]
    } else if (this.activePlayerId) {
      const currentIndex = playerIds.indexOf(this.activePlayerId)
      const nextIndex = (currentIndex + 1) % playerIds.length
      this.activePlayerId = playerIds[nextIndex]
    } else {
      this.activePlayerId = playerIds[0]
    }

    this.timer = this.maxTimer
    this.turnStartTime = Date.now()
    this.server.broadcastState()
  }

  onMessage(message: string, sender: Party.Connection): void {
    try {
      const data = JSON.parse(message) as ClientMessage
      switch (data.type) {
        case ClientMessageType.START_GAME:
          if (
            this.players.get(sender.id)?.isAdmin &&
            this.server.gameState === GameState.LOBBY
          ) {
            this.onStart()
          }
          break
        case ClientMessageType.STOP_GAME:
          if (
            this.players.get(sender.id)?.isAdmin &&
            this.server.gameState === GameState.PLAYING
          ) {
            this.endGame()
          }
          break
        case ClientMessageType.SUBMIT_WORD:
          if (
            this.server.gameState === GameState.PLAYING &&
            this.activePlayerId === sender.id
          ) {
            this.handleGuess(sender.id, data.word)
          }
          break
        case ClientMessageType.UPDATE_TYPING:
          if (
            this.server.gameState === GameState.PLAYING &&
            this.activePlayerId === sender.id
          ) {
            this.broadcast({
              type: ServerMessageType.TYPING_UPDATE,
              text: data.text,
            })
          }
          break
        case ClientMessageType.UPDATE_SETTINGS:
          if (
            this.players.get(sender.id)?.isAdmin &&
            this.server.gameState === GameState.LOBBY
          ) {
            if (data.chatEnabled !== undefined) {
              this.server.chatEnabled = data.chatEnabled
            }
            if (data.gameLogEnabled !== undefined) {
              this.server.gameLogEnabled = data.gameLogEnabled
            }

            // Can update maxTimer
            if (data.maxTimer) {
              const val = Math.max(5, Math.min(30, data.maxTimer))
              this.maxTimer = val
            }
            if (data.maxAttempts) {
              const val = Math.max(1, Math.min(10, data.maxAttempts))
              this.maxAttempts = val
            }
            this.server.broadcastState()
          }
          break
      }
    } catch (e) {
      console.error(e)
    }
  }

  handleGuess(playerId: string, word: string) {
    const upperWord = word.toUpperCase().trim()

    if (upperWord.length !== 5) return

    if (!this.server.dictionary.isWordValid(upperWord)) {
      this.sendTo(playerId, {
        type: ServerMessageType.ERROR,
        message: "Not in dictionary!",
        hide: true,
      })
      return
    }

    // Check result
    const results: GuessResult[] = []
    const targetChars = this.targetWord.split("")
    const guessChars = upperWord.split("")

    // First pass: Correct
    for (let i = 0; i < 5; i++) {
      if (guessChars[i] === targetChars[i]) {
        results[i] = "correct"
        targetChars[i] = "_"
        guessChars[i] = "_"
      }
    }

    // Second pass: Present
    for (let i = 0; i < 5; i++) {
      if (guessChars[i] !== "_") {
        const index = targetChars.indexOf(guessChars[i])
        if (index !== -1) {
          results[i] = "present"
          targetChars[index] = "_"
        } else {
          results[i] = "absent"
        }
      } else if (!results[i]) {
        // Should be correct already
        // results[i] = "correct" // Already set
      }
    }

    this.guesses.push({
      playerId,
      word: upperWord,
      results,
      timestamp: Date.now(),
    })

    if (upperWord === this.targetWord) {
      // Win!
      const p = this.players.get(playerId)
      if (p) {
        p.wins++
      }
      this.endGame(playerId)
    } else if (this.guesses.length >= this.maxAttempts) {
      this.endGame(null)
    } else {
      this.nextTurn()
    }
  }

  endGame(winnerId?: string | null) {
    this.server.gameState = GameState.ENDED
    if (this.tickInterval) clearTimeout(this.tickInterval)
    this.broadcast({
      type: ServerMessageType.GAME_OVER,
      winnerId,
      message: `The word was ${this.targetWord}`,
    })
    this.server.broadcastState()

    setTimeout(() => {
      this.server.gameState = GameState.LOBBY
      this.server.broadcastState()
    }, 5000)
  }

  getState(): Record<string, any> {
    return {
      guesses: this.guesses,
      activePlayerId: this.activePlayerId,
      timer: this.timer,
      maxTimer: this.maxTimer,
      maxAttempts: this.maxAttempts,
    }
  }
}
