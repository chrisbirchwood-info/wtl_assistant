import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // TODO: Dodać weryfikację roli superadmin

    // Pobierz wszystkich użytkowników
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

    return NextResponse.json({
      users: users || [],
    });
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

    // Sprawdź czy użytkownik już istnieje
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

    // Utwórz nowego użytkownika
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

    return NextResponse.json(
      {
        success: true,
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Błąd podczas tworzenia użytkownika:", error);
    return NextResponse.json(
      { error: "Błąd podczas tworzenia użytkownika" },
      { status: 500 }
    );
  }
}

