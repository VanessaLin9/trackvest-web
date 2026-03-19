import { useSyncExternalStore } from 'react'

const initialUserId = import.meta.env.VITE_DEMO_USER_ID?.trim() ?? ''

let currentUserId = initialUserId

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getCurrentUserId() {
  return currentUserId
}

export function getRequiredCurrentUserId() {
  if (!currentUserId) {
    throw new Error('VITE_DEMO_USER_ID is not set. Please set it in your .env file.')
  }

  return currentUserId
}

export function setCurrentUserId(nextUserId: string) {
  const normalizedUserId = nextUserId.trim()

  if (normalizedUserId === currentUserId) {
    return
  }

  currentUserId = normalizedUserId
  emitChange()
}

export function useCurrentUserId() {
  return useSyncExternalStore(subscribe, getCurrentUserId, getCurrentUserId)
}
