import { useStore } from '../src/store/useStore.ts'
import { RealtimeSimulator } from '../src/api/realtimeSimulator.ts'

const beforeTokens = { ...useStore.getState().employees }
const beforeTasks = useStore.getState().tasks.map((t) => t.status)

const sim = new RealtimeSimulator((event) =>
  useStore.getState().applyRealtimeEvent(event)
)
sim.start()

const started = Date.now()

setTimeout(() => {
  const state = useStore.getState()
  sim.stop()

  const heartbeatCount = Object.keys(state.heartbeats).length
  const tokensIncreased = Object.values(state.employees).some(
    (emp) => emp.tokens_used > (beforeTokens[emp.id]?.tokens_used ?? 0)
  )
  const tasksAdvanced = state.tasks.some(
    (t, i) => t.status !== beforeTasks[i]
  )
  const statusChanged = Object.values(state.employees).some(
    (emp) => emp.status !== beforeTokens[emp.id]?.status
  )
  const elapsed = Date.now() - started

  console.log(`elapsed: ${elapsed}ms`)
  console.log(`heartbeats recorded: ${heartbeatCount}`)
  console.log(`tokens increased: ${tokensIncreased}`)
  console.log(`status changed: ${statusChanged}`)
  console.log(`tasks advanced: ${tasksAdvanced}`)

  const ok =
    heartbeatCount > 0 &&
    tokensIncreased &&
    (statusChanged || tasksAdvanced)

  console.log(ok ? '✅ realtime pipeline OK' : '❌ realtime pipeline FAILED')
  process.exit(ok ? 0 : 1)
}, 16000)
