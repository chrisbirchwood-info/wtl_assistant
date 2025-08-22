import axios, { AxiosInstance } from 'axios'

export interface WTLResponse<T = any> {
  success: boolean
  data: T
  error?: string
}

class WTLClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.WTL_API_URL || 'https://api.wtl.com/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.WTL_API_KEY && { 'Authorization': `Bearer ${process.env.WTL_API_KEY}` }),
      }
    })
  }

  async getProjects(): Promise<WTLResponse<any[]>> {
    try {
      const response = await this.client.get('/projects')
      return { success: true, data: response.data }
    } catch (error: any) {
      return { success: false, data: [], error: error.message }
    }
  }

  async getTasks(projectId?: string): Promise<WTLResponse<any[]>> {
    try {
      const endpoint = projectId ? `/projects/${projectId}/tasks` : '/tasks'
      const response = await this.client.get(endpoint)
      return { success: true, data: response.data }
    } catch (error: any) {
      return { success: false, data: [], error: error.message }
    }
  }
}

export const wtlClient = new WTLClient()
export default wtlClient
