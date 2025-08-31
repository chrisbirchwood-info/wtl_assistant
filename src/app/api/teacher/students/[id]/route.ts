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
    
         // Sprawdź czy student istnieje w tabeli students
     const { data: allStudents, error: allStudentsError } = await supabase
       .from("students")
       .select("id, email, username, first_name, last_name, status, created_at, updated_at, last_sync_at, sync_status, wtl_student_id")
       .eq("id", id);
     
     if (allStudentsError) {
       console.error("❌ Błąd sprawdzania istnienia studenta:", allStudentsError);
       return NextResponse.json(
         { error: "Błąd sprawdzania istnienia studenta" },
         { status: 500 }
       );
     }
     
     if (!allStudents || allStudents.length === 0) {
       console.error("❌ Student o ID", id, "nie istnieje w bazie");
       return NextResponse.json(
         { error: "Student nie istnieje" },
         { status: 404 }
       );
     }
     
     const foundStudent = allStudents[0];
     console.log("🔍 Znaleziony student:", foundStudent.email);
     
     console.log("✅ Pobrano dane studenta:", foundStudent.email);
     return NextResponse.json({ user: foundStudent });

  } catch (error) {
    console.error("❌ Błąd podczas pobierania studenta:", error);
    return NextResponse.json(
      { error: "Błąd podczas pobierania danych studenta" },
      { status: 500 }
    );
  }
}
