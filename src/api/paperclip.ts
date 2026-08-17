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

interface ApiResponse {
  companies?: PaperclipCompany[]
  agents?: PaperclipAgent[]
  tasks?: PaperclipTask[]
  activity?: unknown[]
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
