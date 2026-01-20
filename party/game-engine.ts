import type * as Party from "partykit/server"
import type { Player } from "../shared/types"
import { ServerMessageType, GameState } from "../shared/types"
import { DictionaryManager } from "./dictionary"
import type Server from "./server"

export interface GameEngine {
  // Lifecycle
  onStart(): void
  onTick(): void
  onPlayerJoin(player: Player): void
  onPlayerLeave(playerId: string): void
  onMessage(message: string, sender: Party.Connection): void
  dispose(): void

  // State for broadcast
  getState(): Record<string, any>
}

export abstract class BaseGame implements GameEngine {
  protected server: Server

  constructor(server: Server) {
    this.server = server
  }

  abstract onStart(): void
  abstract onTick(): void

  onPlayerJoin(player: Player): void {
    // Default implementation: nothing
  }

  onPlayerLeave(playerId: string): void {
    // Default implementation: nothing
  }

  abstract onMessage(message: string, sender: Party.Connection): void

  dispose(): void {
    // Default cleanup
  }

  abstract getState(): Record<string, any>

  protected get players(): Map<string, Player> {
    return this.server.players
  }

  protected broadcast(data: any): void {
    this.server.broadcast(data)
  }

  protected sendTo(connectionId: string, data: any): void {
    this.server.sendTo(connectionId, data)
  }
}
