'use client'
import { PropsWithChildren, useRef, createContext, useContext, useCallback, useEffect } from 'react'

export type Pose = {
  position: { x: number; y: number; z: number }
  quaternion: { x: number; y: number; z: number; w: number }
  target: { x: number; y: number; z: number }
}

export type Subscriber = {
  id: string
  callback: (pose: Pose, originId: string) => void
}

type SyncChannel = {
  subscribers: Set<Subscriber>
}

type ParanomicViewersSyncContextType = {
  publish: (channel: string, pose: Pose, originId: string) => void
  subscribe: (channel: string, sub: Subscriber) => void
  unsubscribe: (channel: string, sub: Subscriber) => void
}

const initial = {
  publish: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
}

const ParanomicViewersSyncContext = createContext<ParanomicViewersSyncContextType>(initial)

const ParanomicViewersSyncContextProvider = ({ children }: PropsWithChildren<{}>) => {
  const channelsRef = useRef<Map<string, SyncChannel>>(new Map())

  const publish = useCallback(
    (channel: string, pose: Pose, originId: string) => {
      const chan = channelsRef.current.get(channel)
      if (!chan) return
      for (const { id, callback } of chan.subscribers) {
        if (id === originId) continue
        callback(pose, originId)
      }
    },
    [channelsRef.current]
  )

  const subscribe = useCallback(
    (channel: string, sub: Subscriber) => {
      let chan = channelsRef.current.get(channel)
      if (!chan) {
        chan = { subscribers: new Set() }
        channelsRef.current.set(channel, chan)
      }
      chan.subscribers.add(sub)
    },
    [channelsRef.current]
  )

  const unsubscribe = useCallback(
    (channel: string, sub: Subscriber) => {
      const chan = channelsRef.current.get(channel)
      if (!chan) return
      chan.subscribers.delete(sub)
    },
    [channelsRef.current]
  )

  useEffect(() => {
    return () => {
      channelsRef.current.clear()
    }
  }, [])

  return (
    <ParanomicViewersSyncContext.Provider value={{ publish, subscribe, unsubscribe }}>
      {children}
    </ParanomicViewersSyncContext.Provider>
  )
}

export const useParanomicViewersSyncBus = () => {
  const ctx = useContext(ParanomicViewersSyncContext)
  if (!ctx)
    throw new Error(
      'useParanomicViewersSyncBus must be used inside <ParanomicViewersSyncContextProvider>'
    )
  return ctx
}

export default ParanomicViewersSyncContextProvider
