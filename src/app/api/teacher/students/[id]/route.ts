import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pobierz dane studenta - dostępne dla nauczycieli
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
         // Sprawdź czy użytkownik w ogóle istnieje (bez filtrowania po roli)
     const { data: allUsers, error: allUsersError } = await supabase
       .from("users")
       .select("id, email, username, first_name, last_name, role, is_active, created_at, wtl_last_sync, wtl_sync_status")
       .eq("id", id);
     
     if (allUsersError) {
       console.error("❌ Błąd sprawdzania istnienia użytkownika:", allUsersError);
       return NextResponse.json(
         { error: "Błąd sprawdzania istnienia użytkownika" },
         { status: 500 }
       );
     }
     
     if (!allUsers || allUsers.length === 0) {
       console.error("❌ Użytkownik o ID", id, "nie istnieje w bazie");
       return NextResponse.json(
         { error: "Użytkownik nie istnieje" },
         { status: 404 }
       );
     }
     
     const foundUser = allUsers[0];
     console.log("🔍 Znaleziony użytkownik:", foundUser.email, "z rolą:", foundUser.role);
     
     // Sprawdź czy ma rolę studenta
     if (foundUser.role !== 'student') {
       console.error("❌ Użytkownik", foundUser.email, "ma rolę", foundUser.role, "nie student");
       return NextResponse.json(
         { error: `Użytkownik ma rolę ${foundUser.role}, nie student` },
         { status: 403 }
       );
     }
     
          console.log("✅ Pobrano dane studenta:", foundUser.email);
     return NextResponse.json({ user: foundUser });

  } catch (error) {
    console.error("❌ Błąd podczas pobierania studenta:", error);
    return NextResponse.json(
      { error: "Błąd podczas pobierania danych studenta" },
      { status: 500 }
    );
  }
}
