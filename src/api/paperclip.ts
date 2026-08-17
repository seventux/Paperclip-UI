/**
 * Paperclip API Connector
 *
 * Connects this frontend UI to a running Paperclip instance.
 * Configure VITE_PAPERCLIP_API_URL to point to your Paperclip server.
 */

const PAPERCLIP_API_URL = import.meta.env.VITE_PAPERCLIP_API_URL || 'http://localhost:3100/api'

interface PaperclipCompany {
  id: string
  name: string
  description?: string
}

interface PaperclipAgent {
  id: string
  name: string
  role: string
  title: string
  status: string
  reports_to?: string
  tokens_used: number
  budget: number
}

interface PaperclipTask {
  id: string
  title: string
  assignee_id: string
  status: string
  priority: string
}

interface PaperclipRoutine {
  id: string
  name: string
  description?: string
  steps?: unknown[]
}

interface ApiResponse {
  companies?: PaperclipCompany[]
  agents?: PaperclipAgent[]
  tasks?: PaperclipTask[]
  activity?: unknown[]
  routines?: PaperclipRoutine[]
  run?: unknown
}

class PaperclipConnector {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = PAPERCLIP_API_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Authenticate with Paperclip server
   */
  async connect(apiKey?: string): Promise<boolean> {
    try {
      if (apiKey) {
        this.token = apiKey
      }

      // Test connection
      const res = await fetch(`${this.baseUrl}/health`, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      })

      if (res.ok) {
        console.log('✅ Connected to Paperclip server at', this.baseUrl)
        return true
      }
      return false
    } catch {
      console.warn('⚠️  Paperclip server not reachable. Running in standalone mode.')
      return false
    }
  }

  /**
   * Fetch all companies
   */
  async getCompanies(): Promise<PaperclipCompany[]> {
    const res = await this.request('/companies')
    return (res as ApiResponse)?.companies || []
  }

  /**
   * Fetch org chart agents for a company
   */
  async getAgents(companyId: string): Promise<PaperclipAgent[]> {
    const res = await this.request(`/companies/${companyId}/agents`)
    return (res as ApiResponse)?.agents || []
  }

  /**
   * Reassign an agent to a new manager
   */
  async reassignAgent(
    companyId: string,
    agentId: string,
    newManagerId: string
  ): Promise<boolean> {
    const res = await this.request(
      `/companies/${companyId}/agents/${agentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ reports_to: newManagerId }),
      }
    )
    return !!res
  }

  /**
   * Fetch tasks for a company
   */
  async getTasks(companyId: string): Promise<PaperclipTask[]> {
    const res = await this.request(`/companies/${companyId}/tasks`)
    return (res as ApiResponse)?.tasks || []
  }

  /**
   * Fetch agent activity and costs
   */
  async getAgentActivity(
    companyId: string,
    agentId: string
  ): Promise<unknown[]> {
    const res = await this.request(
      `/companies/${companyId}/agents/${agentId}/activity`
    )
    return (res as ApiResponse)?.activity || []
  }

  /**
   * Fetch workflow routines available on the Paperclip server
   */
  async getRoutines(): Promise<PaperclipRoutine[]> {
    const res = await this.request('/routines')
    return (res as ApiResponse)?.routines || []
  }

  /**
   * Trigger a workflow routine on the Paperclip server.
   * Returns the server response, or null when offline/unreachable.
   */
  async runRoutine(
    routineId: string,
    payload?: Record<string, unknown>
  ): Promise<unknown> {
    return this.request(`/routines/${routineId}/run`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    })
  }

  /**
   * Generic request helper
   */
  private async request(
    path: string,
    options: RequestInit = {}
  ): Promise<unknown> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
      }

      const res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
      })

      if (!res.ok) {
        console.warn(`Paperclip API error: ${res.status} ${res.statusText}`)
        return null
      }

      return await res.json()
    } catch {
      // Silent fail for offline mode
      return null
    }
  }
}

// Singleton instance
export const paperclip = new PaperclipConnector()

export type { PaperclipCompany, PaperclipAgent, PaperclipTask }

/* ------------------------------------------------------------------ */
/* Real-time WebSocket connection                                      */
/* ------------------------------------------------------------------ */

import type {
  RealtimeEvent,
  RealtimeMode,
  AgentStatusEvent,
  TaskUpdateEvent,
} from '../types'

const WS_PING_INTERVAL = 30000 // ms between heartbeat pings
const WS_RECONNECT_BASE = 1000 // initial reconnect delay
const WS_RECONNECT_MAX = 30000 // max reconnect delay

/**
 * Derive a WebSocket URL from the API base URL.
 * http://localhost:3100/api → ws://localhost:3100/ws
 */
function resolveWsUrl(): string {
  const explicit = import.meta.env.VITE_PAPERCLIP_WS_URL as string | undefined
  if (explicit) return explicit

  const api = PAPERCLIP_API_URL.replace(/\/$/, '')
  const wsBase = api.replace(/^https?:/, (m: string) => (m === 'https:' ? 'wss:' : 'ws:'))
  // Replace the trailing /api (if present) with /ws
  return wsBase.endsWith('/api') ? `${wsBase.slice(0, -4)}/ws` : `${wsBase}/ws`
}

type RealtimeListener = (event: RealtimeEvent) => void

export class PaperclipSocket {
  private ws: WebSocket | null = null
  private url: string
  private companyId: string | null = null
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<RealtimeListener>()
  private modeListeners = new Set<(mode: RealtimeMode) => void>()
  private mode: RealtimeMode = 'offline'
  private manuallyClosed = false

  constructor(url: string = resolveWsUrl()) {
    this.url = url
  }

  /** Current connection mode: live when connected to server, offline otherwise */
  get connectionMode(): RealtimeMode {
    return this.mode
  }

  /** Subscribe to connection mode changes (connecting / live / offline) */
  onModeChange(listener: (mode: RealtimeMode) => void): () => void {
    this.modeListeners.add(listener)
    return () => this.modeListeners.delete(listener)
  }

  /**
   * Open the WebSocket and start receiving real-time events.
   * Auto-reconnects with exponential backoff until disconnect() is called.
   */
  connect(companyId?: string): void {
    if (companyId) this.companyId = companyId
    this.manuallyClosed = false
    this.open()
  }

  /** Subscribe to typed realtime events */
  on(listener: RealtimeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Close the connection and stop reconnecting */
  disconnect(): void {
    this.manuallyClosed = true
    this.clearTimers()
    this.ws?.close()
    this.ws = null
    this.setMode('offline')
  }

  private open(): void {
    if (this.manuallyClosed) return
    this.setMode('connecting')

    let ws: WebSocket
    try {
      ws = new WebSocket(this.url)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempts = 0
      this.setMode('live')
      // Ask the server to stream updates for this company
      if (this.companyId) {
        ws.send(JSON.stringify({ type: 'subscribe', companyId: this.companyId }))
      }
      // Periodic ping so the server knows we're alive
      this.pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, WS_PING_INTERVAL)
    }

    ws.onmessage = (event) => {
      const parsed = this.parseMessage(event.data)
      if (parsed) {
        this.emit(parsed)
      }
    }

    ws.onerror = () => {
      // onclose will handle reconnect
    }

    ws.onclose = () => {
      this.clearTimers()
      if (this.ws === ws) this.ws = null
      if (!this.manuallyClosed) {
        this.setMode('offline')
        this.scheduleReconnect()
      }
    }
  }

  /** Parse an incoming server message into a typed RealtimeEvent */
  private parseMessage(data: unknown): RealtimeEvent | null {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(String(data))
    } catch {
      return null
    }
    if (typeof msg !== 'object' || msg === null) return null

    const ts = typeof msg.timestamp === 'number' ? msg.timestamp : Date.now()
    const type = msg.type as string

    switch (type) {
      case 'agent_status': {
        if (typeof msg.agentId !== 'string') return null
        const status = ['active', 'idle', 'offline'].includes(String(msg.status))
          ? (msg.status as AgentStatusEvent['status'])
          : 'idle'
        return { type: 'agent_status', agentId: msg.agentId, status, timestamp: ts }
      }
      case 'token_usage': {
        if (typeof msg.agentId !== 'string') return null
        const tokens = Number(msg.tokensUsed ?? msg.tokens)
        if (!Number.isFinite(tokens) || tokens < 0) return null
        return { type: 'token_usage', agentId: msg.agentId, tokensUsed: tokens, timestamp: ts }
      }
      case 'heartbeat': {
        if (typeof msg.agentId !== 'string') return null
        return { type: 'heartbeat', agentId: msg.agentId, timestamp: ts }
      }
      case 'task_update': {
        if (typeof msg.taskId !== 'string') return null
        const status = ['todo', 'in-progress', 'review', 'done'].includes(String(msg.status))
          ? (msg.status as TaskUpdateEvent['status'])
          : 'todo'
        return { type: 'task_update', taskId: msg.taskId, status, timestamp: ts }
      }
      default:
        return null
    }
  }

  private emit(event: RealtimeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.warn('Realtime listener error:', err)
      }
    })
  }

  private setMode(mode: RealtimeMode): void {
    if (this.mode === mode) return
    this.mode = mode
    this.modeListeners.forEach((listener) => {
      try {
        listener(mode)
      } catch (err) {
        console.warn('Realtime mode listener error:', err)
      }
    })
  }

  private scheduleReconnect(): void {
    if (this.manuallyClosed || this.reconnectTimer) return
    const delay = Math.min(
      WS_RECONNECT_BASE * 2 ** this.reconnectAttempts,
      WS_RECONNECT_MAX
    )
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, delay)
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}

// Singleton WebSocket client
export const paperclipSocket = new PaperclipSocket()

export type { RealtimeEvent, RealtimeMode }

