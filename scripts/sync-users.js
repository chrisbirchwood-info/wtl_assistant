import { UserSyncService } from '../src/lib/user-sync-service.js'

async function runSync() {
  const syncService = new UserSyncService()
  
  console.log('🔄 Starting user synchronization...')
  console.log('⏰ Started at:', new Date().toISOString())
  
  try {
    // Sprawdź argumenty linii poleceń
    const args = process.argv.slice(2)
    const syncType = args[0] || 'bulk'
    const role = args[1]
    
    let result
    
    if (syncType === 'single' && args[1]) {
      console.log(`🔄 Single user sync for: ${args[1]}`)
      result = await syncService.syncUser(args[1])
      console.log('✅ Single sync result:', result)
    } else if (syncType === 'role' && role && (role === 'student' || role === 'teacher')) {
      console.log(`🔄 Role-based sync for: ${role}`)
      result = await syncService.syncUsersByRole(role)
      console.log(`✅ Role sync completed: ${result.synced} synced, ${result.failed} failed`)
    } else {
      console.log('🔄 Bulk sync for all users')
      result = await syncService.syncAllUsers()
      console.log(`✅ Bulk sync completed: ${result.synced} synced, ${result.failed} failed`)
    }
    
    // Pokaż statystyki
    const stats = await syncService.getSyncStats()
    console.log('\n📊 Sync Statistics:')
    console.log(`Total Users: ${stats.totalUsers}`)
    console.log(`Synced: ${stats.syncedUsers}`)
    console.log(`Failed: ${stats.failedUsers}`)
    console.log(`Pending: ${stats.pendingUsers}`)
    console.log(`Students: ${stats.students}`)
    console.log(`Teachers: ${stats.teachers}`)
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
    }
    
    console.log('\n⏰ Completed at:', new Date().toISOString())
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

// Uruchom synchronizację
runSync()
