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

export interface WTLUser {
  id: string
  email: string
  name?: string
  role?: 'student' | 'teacher' | 'superadmin'
  // Dodatkowe pola z WTL API
}

export interface WTLUserWithRole extends WTLUser {
  role: 'student' | 'teacher' | 'superadmin'
  // Pola specyficzne dla roli
}

class WTLClient {
  private client: AxiosInstance

  constructor() {
    // Prawdziwy URL WTL API
    const baseURL = process.env.WTL_API_URL || 'https://teachm3.elms.pl/api/v1'
    
    console.log('WTL Client initialized with baseURL:', baseURL)
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'WTL-Assistant/1.0.0',
        // Autoryzacja WTL API zgodnie z dokumentacją
        ...(process.env.WTL_API_KEY && { 
          'X-Auth-Token': process.env.WTL_API_KEY
        }),
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
      console.log('🔍 Attempting to fetch projects from WTL API...')
      console.log('Base URL:', this.client.defaults.baseURL)
      
      // Endpointy zgodnie z dokumentacją WTL API - pobierz wszystkie (range=[0,1000])
      const endpoints = [
        '/training/list?range=[0,1000]&sort=["name", "ASC"]',
        '/course/list?range=[0,1000]&sort=["name", "ASC"]',
        '/training/list',
        '/course/list',
        '/projects',
        '/courses'
      ]
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🌐 Trying endpoint: ${endpoint}`)
          const response = await this.client.get(endpoint)
          
          console.log(`✅ SUCCESS: Data fetched from ${endpoint}`)
          console.log('Response status:', response.status)
          console.log('Response data sample:', JSON.stringify(response.data).substring(0, 200))
          
          // Sprawdź czy dane są w oczekiwanym formacie
          let projects = response.data
          
          // Obsłuż różne formaty odpowiedzi
          if (response.data?.data) {
            projects = response.data.data
          } else if (response.data?.projects) {
            projects = response.data.projects
          } else if (response.data?.courses) {
            projects = response.data.courses
          } else if (response.data?.items) {
            projects = response.data.items
          }
          
          // Upewnij się że to jest array
          if (!Array.isArray(projects)) {
            projects = [projects]
          }
          
          console.log(`📊 Processed ${projects.length} items from WTL API`)
          return { success: true, data: projects }
          
        } catch (error: any) {
          console.log(`❌ Failed ${endpoint}: ${error.response?.status || error.message}`)
          continue
        }
      }
      
      throw new Error('All WTL endpoints failed')
    } catch (error: any) {
      console.error('🚫 WTL Projects critical error:', error.message)
      return { success: false, data: [], error: error.message }
    }
  }

  async getTasks(projectId?: string): Promise<WTLResponse<any[]>> {
    try {
      console.log('🔍 Attempting to fetch tasks from WTL API...')
      
      // Endpointy zgodnie z dokumentacją WTL API - pobierz wszystkie zadania
      const endpoints = projectId 
        ? [
            `/task/list?range=[0,1000]&filter=[{"field": "training_id", "type": "equals", "value": "${projectId}"}]&sort=["id", "ASC"]`,
            `/training/${projectId}/task/list?range=[0,1000]&sort=["id", "ASC"]`
          ]
        : [`/task/list?range=[0,1000]&sort=["id", "ASC"]`, '/assignment/list?range=[0,1000]']
      
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

  async getLessons(trainingId?: string): Promise<WTLResponse<any[]>> {
    try {
      console.log('🔍 Attempting to fetch lessons from WTL API...')
      
      // Endpointy dla lekcji zgodnie z dokumentacją - pobierz wszystkie (range=[0,1000])
      const endpoints = trainingId 
        ? [
            `/lesson/list?range=[0,1000]&filter=[{"field": "training_id", "type": "equals", "value": "${trainingId}"}]&sort=["order", "ASC"]`,
            `/training/${trainingId}/lesson/list?range=[0,1000]&sort=["order", "ASC"]`
          ]
        : [`/lesson/list?range=[0,1000]&sort=["order", "ASC"]`, '/lessons', '/lesson']
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🌐 Trying lessons endpoint: ${endpoint}`)
          const response = await this.client.get(endpoint)
          
          console.log(`✅ SUCCESS: Lessons fetched from ${endpoint}`)
          console.log('Response status:', response.status)
          console.log('Response data sample:', JSON.stringify(response.data).substring(0, 200))
          
          // Sprawdź czy dane są w oczekiwanym formacie
          let lessons = response.data
          
          // Obsłuż różne formaty odpowiedzi
          if (response.data?.data) {
            lessons = response.data.data
          } else if (response.data?.lessons) {
            lessons = response.data.lessons
          } else if (response.data?.items) {
            lessons = response.data.items
          }
          
          // Upewnij się że to jest array
          if (!Array.isArray(lessons)) {
            lessons = [lessons]
          }
          
          console.log(`📚 Processed ${lessons.length} lessons from WTL API`)
          return { success: true, data: lessons }
          
        } catch (error: any) {
          console.log(`❌ Failed ${endpoint}: ${error.response?.status || error.message}`)
          continue
        }
      }
      
      throw new Error('All WTL lesson endpoints failed')
    } catch (error: any) {
      console.error('🚫 WTL Lessons critical error:', error.message)
      return { success: false, data: [], error: error.message }
    }
  }

  /**
   * Weryfikuje czy użytkownik istnieje w systemie WebToLearn
   * Zgodnie z dokumentacją API: GET /user/by-email/:email
   */
  async verifyUserByEmail(email: string): Promise<WTLResponse<any>> {
    try {
      console.log(`🔍 Verifying user by email: ${email}`)
      
      // Endpoint zgodny z dokumentacją WTL API
      const endpoint = `/user/by-email/${encodeURIComponent(email)}`
      
      const response = await this.client.get(endpoint)
      
      console.log(`✅ User verified: ${email}`)
      console.log('User data:', response.data)
      
      return { 
        success: true, 
        data: response.data 
      }
      
    } catch (error: any) {
      console.log(`❌ User verification failed for ${email}: ${error.response?.status || error.message}`)
      
      // Jeśli użytkownik nie istnieje (404), zwróć odpowiedni błąd
      if (error.response?.status === 404) {
        return { 
          success: false, 
          data: null, 
          error: 'User not found in WebToLearn system' 
        }
      }
      
      return { 
        success: false, 
        data: null, 
        error: error.message || 'Failed to verify user' 
      }
    }
  }

  /**
   * Weryfikuje użytkownika i określa jego rolę w systemie WTL
   */
  async verifyUserWithRole(email: string): Promise<WTLResponse<WTLUserWithRole>> {
    try {
      console.log(`🔍 Verifying user with role: ${email}`)
      
      // 1. Sprawdź podstawowe dane użytkownika
      const userResponse = await this.verifyUserByEmail(email)
      
      if (!userResponse.success) {
        return userResponse
      }

      const user = userResponse.data
      
      // 2. Określ rolę użytkownika na podstawie różnych endpointów
      const role = await this.determineUserRole(user.id, email)
      
      return {
        success: true,
        data: {
          ...user,
          role
        }
      }
      
    } catch (error: any) {
      console.error(`❌ User role verification failed for ${email}:`, error)
      return {
        success: false,
        data: {} as WTLUserWithRole,
        error: error.message || 'Failed to verify user role'
      }
    }
  }

  /**
   * Określa rolę użytkownika na podstawie różnych endpointów WTL
   */
  private async determineUserRole(userId: string, email: string): Promise<'student' | 'teacher' | 'superadmin'> {
    try {
      // Sprawdź czy użytkownik jest nauczycielem (ma dostęp do panelu nauczyciela)
      const teacherEndpoints = [
        `/teacher/profile/${userId}`,
        `/instructor/${userId}`,
        `/user/${userId}/role`
      ]

      for (const endpoint of teacherEndpoints) {
        try {
          const response = await this.client.get(endpoint)
          if (response.data && response.data.role === 'teacher') {
            return 'teacher'
          }
        } catch (error) {
          // Endpoint nie istnieje lub błąd - kontynuuj sprawdzanie
          continue
        }
      }

      // Sprawdź czy użytkownik ma przypisane kursy jako nauczyciel
      try {
        const teacherCourses = await this.client.get(`/training/list?filter=[{"field": "instructor_id", "type": "equals", "value": "${userId}"}]`)
        if (teacherCourses.data && Array.isArray(teacherCourses.data) && teacherCourses.data.length > 0) {
          return 'teacher'
        }
      } catch (error) {
        // Błąd - kontynuuj sprawdzanie
      }

      // Domyślnie użytkownik jest kursantem
      return 'student'
      
    } catch (error) {
      console.error('Error determining user role:', error)
      // W przypadku błędu, domyślnie ustaw jako kursanta
      return 'student'
    }
  }

  /**
   * Pobiera listę użytkowników z określeniem roli
   */
  async getUsersWithRoles(): Promise<WTLResponse<WTLUserWithRole[]>> {
    try {
      const usersResponse = await this.getUsers()
      
      if (!usersResponse.success) {
        return usersResponse
      }

      // Określ rolę dla każdego użytkownika
      const usersWithRoles = await Promise.all(
        usersResponse.data.map(async (user) => {
          const role = await this.determineUserRole(user.id, user.email)
          return { ...user, role }
        })
      )

      return {
        success: true,
        data: usersWithRoles
      }
      
    } catch (error: any) {
      console.error('Error fetching users with roles:', error)
      return {
        success: false,
        data: [],
        error: error.message
      }
    }
  }

  /**
   * Generyczna metoda do wywoływania dowolnych endpointów WTL API
   */
  async get(endpoint: string): Promise<any> {
    try {
      const response = await this.client.get(endpoint)
      return response
    } catch (error: any) {
      console.error(`Error calling WTL API endpoint ${endpoint}:`, error)
      throw error
    }
  }
}

export const wtlClient = new WTLClient()
export default wtlClient
