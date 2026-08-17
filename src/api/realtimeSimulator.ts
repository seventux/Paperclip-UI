import { useStore } from '../store/useStore'
import type { RealtimeEvent } from '../types'

/**
 * Simulated realtime feed.
 *
 * When no Paperclip server is reachable the UI stays in standalone mode,
 * so this emits realistic agent status / token / heartbeat / task events
 * that flow through the exact same channel as live WebSocket messages.
 */
export class RealtimeSimulator {
  private emit: (event: RealtimeEvent) => void
  private timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(emit: (event: RealtimeEvent) => void) {
    this.emit = emit
  }

  start(): void {
    this.scheduleTokenTick()
    this.scheduleHeartbeatTick()
    this.scheduleStatusTick()
    this.scheduleTaskTick()
  }

  stop(): void {
    this.timers.forEach((t) => clearTimeout(t))
    this.timers.clear()
  }

  private after(fn: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer)
      fn()
    }, ms)
    this.timers.add(timer)
  }

  private randomEmployeeId(): string | null {
    const ids = Object.keys(useStore.getState().employees)
    if (ids.length === 0) return null
    return ids[Math.floor(Math.random() * ids.length)]
  }

  /** Increment a random agent's token counter */
  private scheduleTokenTick(): void {
    this.after(() => {
      const id = this.randomEmployeeId()
      const emp = id ? useStore.getState().employees[id] : null
      if (id && emp) {
        const delta = 400 + Math.floor(Math.random() * 2600)
        this.emit({
          type: 'token_usage',
          agentId: id,
          tokensUsed: emp.tokens_used + delta,
          timestamp: Date.now(),
        })
      }
      this.scheduleTokenTick()
    }, 3000 + Math.random() * 4000)
  }

  /** Heartbeat for every agent that is online right now */
  private scheduleHeartbeatTick(): void {
    this.after(() => {
      const now = Date.now()
      for (const emp of Object.values(useStore.getState().employees)) {
        if (emp.status !== 'offline') {
          this.emit({ type: 'heartbeat', agentId: emp.id, timestamp: now })
        }
      }
      this.scheduleHeartbeatTick()
    }, 3500 + Math.random() * 2500)
  }

  /** Occasionally flip one agent's status */
  private scheduleStatusTick(): void {
    this.after(() => {
      const id = this.randomEmployeeId()
      const emp = id ? useStore.getState().employees[id] : null
      if (id && emp) {
        const roll = Math.random()
        let status = emp.status
        if (emp.status === 'active') {
          if (roll < 0.25) status = 'idle'
        } else if (emp.status === 'idle') {
          if (roll < 0.6) status = 'active'
          else if (roll < 0.7) status = 'offline'
        } else if (roll < 0.45) {
          status = 'active'
        }
        if (status !== emp.status) {
          this.emit({
            type: 'agent_status',
            agentId: id,
            status,
            timestamp: Date.now(),
          })
        }
      }
      this.scheduleStatusTick()
    }, 8000 + Math.random() * 8000)
  }

  /** Advance a random task one step forward */
  private scheduleTaskTick(): void {
    this.after(() => {
      const order: Array<'todo' | 'in-progress' | 'review' | 'done'> = [
        'todo',
        'in-progress',
        'review',
        'done',
      ]
      const tasks = useStore
        .getState()
        .tasks.filter((t) => t.status !== 'done')
      if (tasks.length > 0) {
        const task = tasks[Math.floor(Math.random() * tasks.length)]
        const next = order[order.indexOf(task.status) + 1]
        if (next) {
          this.emit({
            type: 'task_update',
            taskId: task.id,
            status: next,
            timestamp: Date.now(),
          })
        }
      }
      this.scheduleTaskTick()
    }, 12000 + Math.random() * 8000)
  }
}
