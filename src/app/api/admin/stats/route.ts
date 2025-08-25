import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // TODO: Dodać weryfikację roli superadmin

    // Pobierz podstawowe statystyki
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalCourses },
    ] = await Promise.all([
      // Liczba wszystkich użytkowników
      supabase.from("users").select("*", { count: "exact", head: true }),

      // Liczba aktywnych użytkowników
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),

      // Liczba kursów (placeholder - na razie 0)
      Promise.resolve({ count: 0 }),
    ]);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalCourses: totalCourses || 0,
    });
  } catch (error) {
    console.error("Błąd podczas pobierania statystyk:", error);
    return NextResponse.json(
      { error: "Błąd podczas pobierania statystyk" },
      { status: 500 }
    );
  }
}

