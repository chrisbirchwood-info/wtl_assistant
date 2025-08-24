import { NextRequest, NextResponse } from 'next/server'
import { UserSyncService } from '@/lib/user-sync-service'

export async function POST(request: NextRequest) {
  try {
    const { email, syncType, role } = await request.json()
    
    const syncService = new UserSyncService()
    
    if (syncType === 'single' && email) {
      console.log(`🔄 Single user sync requested for: ${email}`)
      const result = await syncService.syncUser(email)
      return NextResponse.json(result)
    } else if (syncType === 'bulk') {
      console.log('🔄 Bulk sync requested for all users')
      const result = await syncService.syncAllUsers()
      return NextResponse.json(result)
    } else if (syncType === 'role' && role) {
      console.log(`🔄 Role-based sync requested for: ${role}`)
      const result = await syncService.syncUsersByRole(role)
      return NextResponse.json(result)
    }
    
    return NextResponse.json(
      { error: 'Invalid sync type or missing parameters' }, 
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    
    const syncService = new UserSyncService()
    
    if (role && (role === 'student' || role === 'teacher')) {
      console.log(`📊 Sync stats requested for role: ${role}`)
      const stats = await syncService.getSyncStatsByRole(role)
      return NextResponse.json(stats)
    } else {
      console.log('📊 General sync stats requested')
      const stats = await syncService.getSyncStats()
      return NextResponse.json(stats)
    }
  } catch (error: any) {
    console.error('Sync stats API error:', error)
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    )
  }
}
