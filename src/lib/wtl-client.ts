import axios, { AxiosInstance, AxiosResponse } from 'axios'

export interface WTLResponse<T = any> {
  success: boolean
  data: T
  error?: string
}

/**
 * Dekoduje dane zakodowane w formacie Unicode escape sequences
 * Zgodnie z preferencją użytkownika [[memory:6515498]]
 */
function decodeUnicodeData(data: string): string {
  return data
    .replace(/\\u003C/g, '<')
    .replace(/\\u003E/g, '>')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003D/g, '=')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');
}

class WTLClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.WTL_API_URL || 'https://api.webtolearn.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(process.env.WTL_API_KEY && { 'Authorization': `Bearer ${process.env.WTL_API_KEY}` }),
        'User-Agent': 'WTL-Assistant/1.0.0'
      }
    })

    // Response interceptor to decode Unicode data [[memory:6514980]]
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Dekoduj dane przed użyciem zgodnie z preferencją użytkownika
        if (typeof response.data === 'string') {
          response.data = decodeUnicodeData(response.data)
        } else if (response.data && typeof response.data === 'object') {
          response.data = this.decodeObjectData(response.data)
        }
        return response
      },
      (error) => {
        console.error('WTL API Error:', error.response?.data || error.message)
        return Promise.reject(error)
      }
    )
  }

  private decodeObjectData(obj: any): any {
    if (typeof obj === 'string') {
      return decodeUnicodeData(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.decodeObjectData(item))
    }
    
    if (obj && typeof obj === 'object') {
      const decoded: any = {}
      for (const [key, value] of Object.entries(obj)) {
        decoded[key] = this.decodeObjectData(value)
      }
      return decoded
    }
    
    return obj
  }

  async getProjects(): Promise<WTLResponse<any[]>> {
    try {
      // Próbuj różne endpointy WTL
      const endpoints = ['/projects', '/api/projects', '/v1/projects']
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(endpoint)
          console.log(`WTL Projects fetched from ${endpoint}:`, response.data)
          return { success: true, data: response.data }
        } catch (error) {
          console.log(`Failed to fetch from ${endpoint}:`, error)
          continue
        }
      }
      
      throw new Error('All WTL endpoints failed')
    } catch (error: any) {
      console.error('WTL Projects error:', error.message)
      return { success: false, data: [], error: error.message }
    }
  }

  async getTasks(projectId?: string): Promise<WTLResponse<any[]>> {
    try {
      // Próbuj różne endpointy WTL dla zadań
      const endpoints = projectId 
        ? [`/projects/${projectId}/tasks`, `/api/projects/${projectId}/tasks`, `/v1/projects/${projectId}/tasks`]
        : ['/tasks', '/api/tasks', '/v1/tasks']
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(endpoint)
          console.log(`WTL Tasks fetched from ${endpoint}:`, response.data)
          return { success: true, data: response.data }
        } catch (error) {
          console.log(`Failed to fetch from ${endpoint}:`, error)
          continue
        }
      }
      
      throw new Error('All WTL task endpoints failed')
    } catch (error: any) {
      console.error('WTL Tasks error:', error.message)
      return { success: false, data: [], error: error.message }
    }
  }

  async getUsers(): Promise<WTLResponse<any[]>> {
    try {
      const endpoints = ['/users', '/api/users', '/v1/users']
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(endpoint)
          console.log(`WTL Users fetched from ${endpoint}:`, response.data)
          return { success: true, data: response.data }
        } catch (error) {
          console.log(`Failed to fetch from ${endpoint}:`, error)
          continue
        }
      }
      
      throw new Error('All WTL user endpoints failed')
    } catch (error: any) {
      console.error('WTL Users error:', error.message)
      return { success: false, data: [], error: error.message }
    }
  }

  async getCourses(): Promise<WTLResponse<any[]>> {
    try {
      const endpoints = ['/courses', '/api/courses', '/v1/courses']
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(endpoint)
          console.log(`WTL Courses fetched from ${endpoint}:`, response.data)
          return { success: true, data: response.data }
        } catch (error) {
          console.log(`Failed to fetch from ${endpoint}:`, error)
          continue
        }
      }
      
      throw new Error('All WTL course endpoints failed')
    } catch (error: any) {
      console.error('WTL Courses error:', error.message)
      return { success: false, data: [], error: error.message }
    }
  }
}

export const wtlClient = new WTLClient()
export default wtlClient
