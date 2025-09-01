import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/teachers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeParam = searchParams.get('active')
    const onlyActive = activeParam === 'true'

    // Try user_roles driven listing first
    const { data: roleRows, error: roleErr } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_code', 'teacher')

    let teachers: any[] = []

    if (!roleErr && roleRows && roleRows.length > 0) {
      const userIds = roleRows.map((r: any) => r.user_id)
      let query = supabase
        .from('users')
        .select('id, email, username, first_name, last_name, is_active, created_at')
        .in('id', userIds)

      if (onlyActive) query = query.eq('is_active', true)

      const { data: usersData, error: usersErr } = await query
      if (usersErr) {
        return NextResponse.json({ success: false, message: 'Błąd pobierania nauczycieli', error: usersErr.message }, { status: 500 })
      }
      teachers = usersData || []
    } else {
      // Fallback to single-role column
      let query = supabase
        .from('users')
        .select('id, email, username, first_name, last_name, is_active, created_at, role')
        .eq('role', 'teacher')
      if (onlyActive) query = query.eq('is_active', true)
      const { data: usersData, error: usersErr } = await query
      if (usersErr) {
        return NextResponse.json({ success: false, message: 'Błąd pobierania nauczycieli', error: usersErr.message }, { status: 500 })
      }
      teachers = (usersData || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        first_name: u.first_name,
        last_name: u.last_name,
        is_active: u.is_active,
        created_at: u.created_at,
      }))
    }

    return NextResponse.json({ success: true, teachers })
  } catch (error) {
    console.error('GET /api/admin/teachers error:', error)
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

