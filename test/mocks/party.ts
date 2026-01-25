import { vi } from "vitest"
import type * as Party from "partykit/server"

export class MockStorage implements Party.Storage {
  data = new Map<string, any>()
  alarms = new Map<string, number>()

  async get<T>(key: string): Promise<T | undefined>
  async get<T>(keys: string[]): Promise<Map<string, T>>
  async get(keyOrKeys: string | string[]) {
    if (Array.isArray(keyOrKeys)) {
      const result = new Map()
      keyOrKeys.forEach((k) => {
        if (this.data.has(k)) result.set(k, this.data.get(k))
      })
      return result
    }
    return this.data.get(keyOrKeys)
  }

  async put(key: string, value: any): Promise<void>
  async put(data: Record<string, any>): Promise<void>
  async put(keyOrData: string | Record<string, any>, value?: any) {
    if (typeof keyOrData === "string") {
      this.data.set(keyOrData, value)
    } else {
      Object.entries(keyOrData).forEach(([k, v]) => this.data.set(k, v))
    }
  }

  async delete(key: string): Promise<boolean>
  async delete(keys: string[]): Promise<number>
  async delete(keyOrKeys: string | string[]) {
    if (Array.isArray(keyOrKeys)) {
      let count = 0
      keyOrKeys.forEach((k) => {
        if (this.data.delete(k)) count++
      })
      return count
    }
    return this.data.delete(keyOrKeys)
  }

  async deleteAll() {
    this.data.clear()
  }

  async list() {
    return this.data
  }

  async getAlarm() {
    return null
  }
  async setAlarm() {}
  async deleteAlarm() {}

  // New methods to satisfy interface
  async transaction<T>(closure: (txn: any) => Promise<T>): Promise<T> {
    // Create a transaction-like object that has rollback and extends storage
    const txn = {
      ...this,
      rollback: vi.fn(),
      deleteAll: this.deleteAll.bind(this),
      get: this.get.bind(this),
      put: this.put.bind(this),
      delete: this.delete.bind(this),
      list: this.list.bind(this),
      getAlarm: this.getAlarm.bind(this),
      setAlarm: this.setAlarm.bind(this),
      deleteAlarm: this.deleteAlarm.bind(this),
    }
    return closure(txn)
  }
  async sync() {} // No-op for mock
  transactionSync<T>(closure: () => T): T {
    return closure()
  }
}

export class MockConnection implements Party.Connection {
  id: string
  socket = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    accept: vi.fn(), // Missing property
    serializeAttachment: vi.fn(),
    deserializeAttachment: vi.fn(),
  } as unknown as WebSocket
  uri = ""

  constructor(id: string) {
    this.id = id
  }

  send = vi.fn()
  close = vi.fn()
  serializeAttachment = vi.fn()
  deserializeAttachment = vi.fn()

  setState = vi.fn()
  state = null as any
}

export class MockRoom implements Party.Room {
  id: string
  name: string = "mock-room" // Added
  internalID = "internal-id"
  connections = new Map<string, Party.Connection>()
  storage = new MockStorage()
  env = {}
  parties = {}
  context = {
    parties: {
      lobby: {
        get: () => ({
          fetch: vi.fn(),
        }),
      },
    },
  } as any

  analytics = {} as any // Added stub
  async blockConcurrencyWhile<T>(closure: () => Promise<T>): Promise<T> {
    return closure() // Added stub
  }

  constructor(id: string) {
    this.id = id
  }

  broadcast = vi.fn()

  getConnections = <TState = unknown>(
    tag?: string,
  ): Iterable<Party.Connection<TState>> => {
    // Return iterator that yields connections cast to correct type
    return this.connections.values() as Iterable<Party.Connection<TState>>
  }

  getConnection = <TState = unknown>(
    id: string,
  ): Party.Connection<TState> | undefined => {
    return this.connections.get(id) as Party.Connection<TState> | undefined
  }
}

export const createMockConnectionContext = (
  ip = "127.0.0.1",
  url = "http://localhost/party/room?mode=bomb-party",
): Party.ConnectionContext => {
  return {
    request: {
      url,
      headers: {
        get: (key: string) => {
          if (key === "x-forwarded-for") return ip
          return null
        },
      } as any,
      // Add other required Request properties as needed, or cast freely if testing logic doesn't touch them
    } as unknown as Party.Request,
  }
}
