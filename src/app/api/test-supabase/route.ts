import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testuję połączenie z Supabase...");

    // Sprawdź zmienne środowiskowe
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("Supabase URL:", supabaseUrl);
    console.log(
      "Service Role Key (pierwsze 20 znaków):",
      serviceRoleKey?.substring(0, 20) + "..."
    );

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error: "Brakujące zmienne środowiskowe",
          supabaseUrl: !!supabaseUrl,
          serviceRoleKey: !!serviceRoleKey,
        },
        { status: 500 }
      );
    }

    // Utwórz klienta Supabase
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Test 1: Sprawdź połączenie
    console.log("1️⃣ Testuję połączenie...");
    const { data: connectionTest, error: connectionError } = await supabase
      .from("users")
      .select("count", { count: "exact", head: true });

    if (connectionError) {
      console.error("❌ Błąd połączenia:", connectionError);
      console.error("❌ Szczegóły błędu:", {
        message: connectionError.message,
        hint: connectionError.hint,
        details: connectionError.details,
        code: connectionError.code,
      });
      return NextResponse.json(
        {
          error: "Błąd połączenia z Supabase",
          details: {
            message: connectionError.message,
            hint: connectionError.hint,
            details: connectionError.details,
            code: connectionError.code,
          },
        },
        { status: 500 }
      );
    }

    console.log("✅ Połączenie działa!");

    // Test 2: Pobierz liczbę użytkowników
    console.log("2️⃣ Pobieram liczbę użytkowników...");
    const { count, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Błąd liczenia użytkowników:", countError);
      return NextResponse.json(
        {
          error: "Błąd liczenia użytkowników",
          details: countError,
        },
        { status: 500 }
      );
    }

    console.log("✅ Liczba użytkowników:", count);

    // Test 3: Pobierz pierwszego użytkownika
    console.log("3️⃣ Pobieram pierwszego użytkownika...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, role, is_active")
      .limit(1);

    if (usersError) {
      console.error("❌ Błąd pobierania użytkowników:", usersError);
      return NextResponse.json(
        {
          error: "Błąd pobierania użytkowników",
          details: usersError,
        },
        { status: 500 }
      );
    }

    console.log("✅ Użytkownicy pobrani:", users);

    return NextResponse.json({
      success: true,
      message: "Test Supabase zakończony pomyślnie",
      results: {
        connection: "OK",
        userCount: count,
        firstUser: users?.[0],
      },
    });
  } catch (error) {
    console.error("❌ Błąd podczas testowania Supabase:", error);
    return NextResponse.json(
      {
        error: "Błąd podczas testowania Supabase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
