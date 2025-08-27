import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Pobierz wszystkich nauczycieli
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/admin/teachers] Rozpoczynam pobieranie nauczycieli...');
    console.log('🌐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('🔑 Service Role Key (pierwsze 20 znaków):', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
    
    // Sprawdź połączenie z bazą
    console.log('🔌 Testuję połączenie z bazą...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Błąd połączenia z bazą:', connectionError);
      console.error('🔍 Szczegóły błędu:', {
        code: connectionError.code,
        message: connectionError.message,
        details: connectionError.details,
        hint: connectionError.hint
      });
      return NextResponse.json({
        success: false,
        message: 'Błąd połączenia z bazą danych',
        error: connectionError.message,
        details: connectionError
      }, { status: 500 });
    }
    
    console.log('✅ Połączenie z bazą OK');
    
    // Sprawdź strukturę tabeli users
    console.log('📋 Sprawdzam strukturę tabeli users...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'users' });
    
    if (tableError) {
      console.log('⚠️ Nie mogę pobrać informacji o tabeli (może brakuje funkcji RPC):', tableError.message);
    } else {
      console.log('📊 Informacje o tabeli users:', tableInfo);
    }
    
    console.log('👥 Pobieram wszystkich nauczycieli...')
    
    // Pobierz nauczycieli tylko z tabeli users (bez teacher_profiles)
    const { data: teachers, error } = await supabase
      .from('users')
      .select('id, email, username, first_name, last_name, role, is_active, created_at')
      .eq('role', 'teacher')
      .eq('is_active', true)
      .order('email', { ascending: true })

    if (error) {
      console.error('❌ Błąd pobierania nauczycieli:', error)
      console.error('🔍 Szczegóły błędu PGRST301:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      
      // Dodatkowe informacje diagnostyczne
      console.error('🔍 Możliwe przyczyny PGRST301:');
      console.error('   - Brak klucza głównego w tabeli users');
      console.error('   - Nieprawidłowy typ klucza głównego');
      console.error('   - Problem z uprawnieniami RLS');
      console.error('   - Nieprawidłowa konfiguracja Supabase');
      
      return NextResponse.json({
        success: false,
        message: 'Wystąpił błąd podczas pobierania nauczycieli',
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    console.log(`✅ Pobrano ${teachers?.length || 0} nauczycieli`)
    
    // Dodaj dodatkowe logowanie dla debugowania
    if (teachers && teachers.length > 0) {
      console.log('📋 Przykładowi nauczyciele:', teachers.slice(0, 3).map(t => ({
        id: t.id,
        email: t.email,
        username: t.username,
        first_name: t.first_name,
        last_name: t.last_name,
        role: t.role
      })))
    }
    
    return NextResponse.json({
      success: true,
      teachers: teachers || []
    })
    
  } catch (error) {
    console.error('💥 Nieoczekiwany błąd podczas pobierania nauczycieli:', error)
    console.error('🔍 Stack trace:', error instanceof Error ? error.stack : 'Brak stack trace');
    return NextResponse.json({
      success: false,
      message: 'Wystąpił nieoczekiwany błąd',
      error: error instanceof Error ? error.message : 'Nieznany błąd',
      details: error
    }, { status: 500 })
  }
}
