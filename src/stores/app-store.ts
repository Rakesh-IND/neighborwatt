import { useSyncExternalStore } from 'react'
import type { AppState } from '../types'
import { STATE_KEY, type StorageAdapter, BrowserStorageAdapter } from '../services/storage'
import { createSeedState } from '../data/seed'

/**
 * Central application store. Every mutation goes through `commit`, which runs an updater against the
 * current state. If the updater throws, nothing is persisted or broadcast, so multi-record operations
 * (balances + offers + ledger) are all-or-nothing.
 */
import { STATE_VERSION } from './constants'
export { STATE_VERSION }

let current: AppState | null = null
let adapter: StorageAdapter | null = null
const listeners = new Set<() => void>()

function persist() {
  if (!adapter || !current) return
  adapter.set(STATE_KEY, JSON.stringify(current))
}

export async function initStore(storage: StorageAdapter = new BrowserStorageAdapter(window.localStorage)) {
  adapter = storage
  const raw = storage.get(STATE_KEY)
  let loaded: AppState | null = null
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && parsed.version === STATE_VERSION && Array.isArray(parsed.accounts)) loaded = parsed
    } catch {
      loaded = null
    }
  }
  current = loaded ?? (await createSeedState())
  persist()
  listeners.forEach((l) => l())
  return current
}

/** Reset to the seeded demo dataset. */
export async function resetStore() {
  current = await createSeedState()
  persist()
  listeners.forEach((l) => l())
}

export function getState(): AppState {
  if (!current) throw new Error('Store not initialised. Call initStore() before rendering.')
  return current
}

export function commit<T>(updater: (draft: AppState) => { next: AppState; result: T }): T {
  const base = getState()
  const { next, result } = updater(structuredClone(base))
  current = next
  persist()
  listeners.forEach((l) => l())
  return result
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState)
}

/** Test helper */
export function __setStateForTests(state: AppState | null) {
  current = state
}
