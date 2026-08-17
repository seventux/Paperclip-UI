import { useEffect, useRef } from 'react'
import { paperclipSocket } from '../api/paperclip'
import { RealtimeSimulator } from '../api/realtimeSimulator'
import { useStore } from '../store/useStore'
import type { RealtimeEvent, RealtimeMode } from '../types'

/**
 * Connect realtime events (WebSocket or simulated) into the store.
 * Call once at the app root.
 */
export function useRealtime(companyId?: string): void {
  const simulatorRef = useRef<RealtimeSimulator | null>(null)
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const apply = (event: RealtimeEvent) =>
      useStore.getState().applyRealtimeEvent(event)

    const stopSimulation = () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current)
        startTimerRef.current = null
      }
      simulatorRef.current?.stop()
      simulatorRef.current = null
    }

    const scheduleSimulation = (delay = 2000) => {
      if (simulatorRef.current || startTimerRef.current) return
      startTimerRef.current = setTimeout(() => {
        startTimerRef.current = null
        if (useStore.getState().realtimeMode === 'live') return
        // Switch the indicator to simulated mode while the feed is running
        useStore.getState().setRealtimeMode('simulated')
        const sim = new RealtimeSimulator(apply)
        simulatorRef.current = sim
        sim.start()
      }, delay)
    }

    const syncMode = (mode: RealtimeMode) => {
      if (simulatorRef.current) {
        // The simulated feed is already running; only leave it if the real
        // server comes online, otherwise ignore reconnect noise.
        if (mode === 'live') {
          stopSimulation()
          useStore.getState().setRealtimeMode('live')
        }
        return
      }
      if (mode === 'live') {
        useStore.getState().setRealtimeMode('live')
      } else {
        useStore.getState().setRealtimeMode(mode)
        scheduleSimulation()
      }
    }

    const unsubscribe = paperclipSocket.on(apply)
    const unsubscribeMode = paperclipSocket.onModeChange(syncMode)

    paperclipSocket.connect(companyId)
    // Give the server a moment to answer before falling back to simulation
    scheduleSimulation()

    return () => {
      unsubscribe()
      unsubscribeMode()
      paperclipSocket.disconnect()
      stopSimulation()
    }
  }, [companyId])
}
