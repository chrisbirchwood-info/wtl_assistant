import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UserSyncService } from "@/lib/user-sync-service";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // TODO: Dodać weryfikację roli superadmin
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, role, created_at, is_active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Błąd podczas pobierania użytkowników:", error);
      return NextResponse.json(
        { error: "Błąd podczas pobierania użytkowników" },
        { status: 500 }
      );
    }
    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("Błąd podczas pobierania użytkowników:", error);
    return NextResponse.json(
      { error: "Błąd podczas pobierania użytkowników" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Dodać weryfikację roli superadmin
    const body = await request.json();
    const { email, role, password } = body;

    if (!email || !role || !password) {
      return NextResponse.json(
        { error: "Brakuje wymaganych pól: email, role, password" },
        { status: 400 }
      );
    }
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Użytkownik z tym emailem już istnieje" },
        { status: 400 }
      );
    }
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          role,
          password_hash: password, // TODO: Dodać hashowanie hasła
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Błąd podczas tworzenia użytkownika:", error);
      return NextResponse.json(
        { error: "Błąd podczas tworzenia użytkownika" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Błąd podczas tworzenia użytkownika:", error);
    return NextResponse.json(
      { error: "Błąd podczas tworzenia użytkownika" },
      { status: 500 }
    );
  }
}

// Nowy endpoint do synchronizacji z WTL
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "sync-wtl") {
      console.log(
        "🔄 Rozpoczynam synchronizację wszystkich użytkowników z WTL..."
      );

      const syncService = new UserSyncService();

      // Synchronizuj wszystkich użytkowników z WTL
      const result = await syncService.syncAllUsersFromWTL();

      console.log("✅ Synchronizacja z WTL zakończona:", result);

      return NextResponse.json({
        success: true,
        message: "Synchronizacja z WTL zakończona pomyślnie",
        result: result,
      });
    }

    return NextResponse.json({ error: "Nieznana akcja" }, { status: 400 });
  } catch (error) {
    console.error("Błąd podczas synchronizacji z WTL:", error);
    return NextResponse.json(
      { error: "Błąd podczas synchronizacji z WTL" },
      { status: 500 }
    );
  }
}
