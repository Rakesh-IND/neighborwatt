/**
 * Storage abstraction. The app talks to `StorageAdapter`, never to window.localStorage directly.
 * A real backend would replace this with an API client implementing the same contract.
 */
export interface StorageAdapter {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export class BrowserStorageAdapter implements StorageAdapter {
  private readonly backing: Storage
  constructor(backing: Storage) {
    this.backing = backing
  }
  get(key: string) {
    try {
      return this.backing.getItem(key)
    } catch {
      return null
    }
  }
  set(key: string, value: string) {
    try {
      this.backing.setItem(key, value)
    } catch {
      /* quota or private mode: state stays in memory for this session */
    }
  }
  remove(key: string) {
    this.backing.removeItem(key)
  }
}

export class MemoryStorageAdapter implements StorageAdapter {
  private map = new Map<string, string>()
  get(key: string) {
    return this.map.get(key) ?? null
  }
  set(key: string, value: string) {
    this.map.set(key, value)
  }
  remove(key: string) {
    this.map.delete(key)
  }
}

export const STATE_KEY = 'neighborwatt:v1:state'
export const SESSION_LOCAL_KEY = 'neighborwatt:v1:session-remembered'
export const SESSION_TAB_KEY = 'neighborwatt:v1:session-tab'
