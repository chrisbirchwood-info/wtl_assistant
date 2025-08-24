import { supabase } from './supabase'
import { wtlClient, WTLUserWithRole } from './wtl-client'

export interface SyncResult {
  success: boolean
  action: 'created' | 'updated' | 'synced' | 'error' | 'not_found_in_wtl'
  user?: any
  error?: string
}

export interface BulkSyncResult {
  total: number
  synced: number
  failed: number
  errors: string[]
}

export class UserSyncService {
  /**
   * Synchronizuje pojedynczego użytkownika z określeniem roli
   */
  async syncUser(email: string): Promise<SyncResult> {
    try {
      console.log(`🔄 Syncing user: ${email}`)
      
      // 1. Sprawdź użytkownika w WTL z rolą
      const wtlUser = await wtlClient.verifyUserWithRole(email)
      
      if (wtlUser.success && wtlUser.data) {
        // 2. Zaktualizuj/utwórz użytkownika w Supabase
        const supabaseUser = await this.upsertUserFromWTL(wtlUser.data)
        
        // 3. Zaktualizuj profil odpowiedni dla roli
        await this.updateUserProfile(supabaseUser.id, wtlUser.data)
        
        // 4. Zaloguj synchronizację
        await this.logSyncEvent(supabaseUser.id, 'update', 'success', wtlUser.data.role)
        
        return { 
          success: true, 
          action: 'synced', 
          user: supabaseUser 
        }
      } else {
        // 5. Użytkownik nie istnieje w WTL
        await this.markUserAsUnsynced(email)
        await this.logSyncEvent(null, 'verify', 'failed', 'student', `User not found: ${email}`)
        
        return { 
          success: false, 
          action: 'not_found_in_wtl' 
        }
      }
    } catch (error: any) {
      console.error('Sync error:', error)
      await this.logSyncEvent(null, 'sync', 'error', 'student', error.message)
      
      return { 
        success: false, 
        action: 'error', 
        error: error.message 
      }
    }
  }

  /**
   * Synchronizacja masowa wszystkich użytkowników
   */
  async syncAllUsers(): Promise<BulkSyncResult> {
    try {
      console.log('🔄 Starting bulk user synchronization...')
      
      // 1. Pobierz wszystkich użytkowników z WTL z rolami
      const wtlUsers = await wtlClient.getUsersWithRoles()
      
      if (!wtlUsers.success) {
        throw new Error('Failed to fetch WTL users')
      }

      console.log(`📊 Found ${wtlUsers.data.length} users in WTL`)

      // 2. Synchronizuj każdego użytkownika
      const results = await Promise.allSettled(
        wtlUsers.data.map(user => this.syncUser(user.email))
      )

      // 3. Przetwórz wyniki
      const synced = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.filter(r => r.status === 'rejected' || !r.value?.success).length
      const errors = results
        .filter(r => r.status === 'rejected' || !r.value?.success)
        .map(r => r.status === 'rejected' ? r.reason?.message : r.value?.error)
        .filter(Boolean)

      console.log(`✅ Bulk sync completed: ${synced} synced, ${failed} failed`)

      return {
        total: wtlUsers.data.length,
        synced,
        failed,
        errors
      }
      
    } catch (error: any) {
      console.error('Bulk sync error:', error)
      throw error
    }
  }

  /**
   * Synchronizacja użytkowników określonej roli
   */
  async syncUsersByRole(role: 'student' | 'teacher'): Promise<BulkSyncResult> {
    try {
      console.log(`🔄 Starting sync for role: ${role}`)
      
      // 1. Pobierz użytkowników z WTL
      const wtlUsers = await wtlClient.getUsersWithRoles()
      
      if (!wtlUsers.success) {
        throw new Error('Failed to fetch WTL users')
      }

      // 2. Filtruj użytkowników po roli
      const usersWithRole = wtlUsers.data.filter(user => user.role === role)
      
      console.log(`📊 Found ${usersWithRole.length} ${role}s in WTL`)

      // 3. Synchronizuj użytkowników określonej roli
      const results = await Promise.allSettled(
        usersWithRole.map(user => this.syncUser(user.email))
      )

      // 4. Przetwórz wyniki
      const synced = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.filter(r => r.status === 'rejected' || !r.value?.success).length
      const errors = results
        .filter(r => r.status === 'rejected' || !r.value?.success)
        .map(r => r.status === 'rejected' ? r.reason?.message : r.value?.error)
        .filter(Boolean)

      return {
        total: usersWithRole.length,
        synced,
        failed,
        errors
      }
      
    } catch (error: any) {
      console.error(`Role sync error for ${role}:`, error)
      throw error
    }
  }

  /**
   * Aktualizuje lub tworzy użytkownika w Supabase na podstawie danych z WTL
   */
  private async upsertUserFromWTL(wtlUser: WTLUserWithRole) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', wtlUser.email)
      .single()

    const userData = {
      email: wtlUser.email,
      username: wtlUser.name,
      role: wtlUser.role,
      wtl_user_id: wtlUser.id,
      wtl_last_sync: new Date().toISOString(),
      wtl_sync_status: 'synced'
    }

    if (existingUser) {
      // Aktualizuj istniejącego użytkownika
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', existingUser.id)
        .select()
        .single()

      if (error) throw error
      return updatedUser
    } else {
      // Utwórz nowego użytkownika
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()

      if (error) throw error
      return newUser
    }
  }

  /**
   * Aktualizuje profil użytkownika odpowiedni dla roli
   */
  private async updateUserProfile(userId: string, wtlUser: WTLUserWithRole) {
    if (wtlUser.role === 'teacher') {
      // Aktualizuj profil nauczyciela
      await supabase
        .from('teacher_profiles')
        .upsert({
          user_id: userId,
          // Dodaj więcej pól specyficznych dla nauczycieli
        })
    } else {
      // Aktualizuj profil kursanta
      await supabase
        .from('student_profiles')
        .upsert({
          user_id: userId,
          // Dodaj więcej pól specyficznych dla kursantów
        })
    }
  }

  /**
   * Loguje zdarzenie synchronizacji
   */
  private async logSyncEvent(
    userId: string | null,
    syncType: string,
    status: string,
    userRole: 'student' | 'teacher',
    errorMessage?: string
  ) {
    await supabase
      .from('user_sync_log')
      .insert({
        user_id: userId,
        sync_type: syncType,
        sync_status: status,
        user_role: userRole,
        error_message: errorMessage
      })
  }

  /**
   * Oznacza użytkownika jako niezsynchronizowanego
   */
  private async markUserAsUnsynced(email: string) {
    await supabase
      .from('users')
      .update({ 
        wtl_sync_status: 'failed',
        wtl_last_sync: new Date().toISOString()
      })
      .eq('email', email)
  }

  /**
   * Pobiera statystyki synchronizacji
   */
  async getSyncStats(): Promise<any> {
    const { data: syncLogs } = await supabase
      .from('user_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: users } = await supabase
      .from('users')
      .select('wtl_sync_status, role')

    const stats = {
      totalUsers: users?.length || 0,
      syncedUsers: users?.filter(u => u.wtl_sync_status === 'synced').length || 0,
      failedUsers: users?.filter(u => u.wtl_sync_status === 'failed').length || 0,
      pendingUsers: users?.filter(u => u.wtl_sync_status === 'pending').length || 0,
      students: users?.filter(u => u.role === 'student').length || 0,
      teachers: users?.filter(u => u.role === 'teacher').length || 0,
      recentSyncs: syncLogs || []
    }

    return stats
  }

  /**
   * Pobiera statystyki synchronizacji dla określonej roli
   */
  async getSyncStatsByRole(role: 'student' | 'teacher'): Promise<any> {
    const { data: syncLogs } = await supabase
      .from('user_sync_log')
      .select('*')
      .eq('user_role', role)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: users } = await supabase
      .from('users')
      .select('wtl_sync_status')
      .eq('role', role)

    const stats = {
      role,
      totalUsers: users?.length || 0,
      syncedUsers: users?.filter(u => u.wtl_sync_status === 'synced').length || 0,
      failedUsers: users?.filter(u => u.wtl_sync_status === 'failed').length || 0,
      pendingUsers: users?.filter(u => u.wtl_sync_status === 'pending').length || 0,
      recentSyncs: syncLogs || []
    }

    return stats
  }
}
