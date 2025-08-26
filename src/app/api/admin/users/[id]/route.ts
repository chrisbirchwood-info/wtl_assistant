import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pobierz pojedynczego użytkownika
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Użytkownik nie został znaleziony" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Błąd podczas pobierania użytkownika:", error);
    return NextResponse.json(
      { error: "Błąd podczas pobierania użytkownika" },
      { status: 500 }
    );
  }
}

// Aktualizuj pojedynczego użytkownika
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { email, role, is_active, username } = body;

    // Sprawdź czy użytkownik istnieje
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", id)
      .single();

    if (!existingUser) {
      return NextResponse.json(
        { error: "Użytkownik nie został znaleziony" },
        { status: 404 }
      );
    }

    // Przygotuj dane do aktualizacji
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (username !== undefined) updateData.username = username;

    // Aktualizuj użytkownika
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Błąd podczas aktualizacji użytkownika:", error);
      return NextResponse.json(
        { error: "Błąd podczas aktualizacji użytkownika" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: "Użytkownik został zaktualizowany pomyślnie"
    });

  } catch (error) {
    console.error("Błąd podczas aktualizacji użytkownika:", error);
    return NextResponse.json(
      { error: "Błąd podczas aktualizacji użytkownika" },
      { status: 500 }
    );
  }
}

// Usuń użytkownika
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Sprawdź czy użytkownik istnieje
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("id", id)
      .single();

    if (!existingUser) {
      return NextResponse.json(
        { error: "Użytkownik nie został znaleziony" },
        { status: 404 }
      );
    }

    // Zabezpieczenie przed usunięciem superadmina
    if (existingUser.role === 'superadmin') {
      return NextResponse.json(
        { error: "Nie można usunąć użytkownika z rolą superadmin" },
        { status: 400 }
      );
    }

    // Usuń użytkownika
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Błąd podczas usuwania użytkownika:", error);
      return NextResponse.json(
        { error: "Błąd podczas usuwania użytkownika" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Użytkownik ${existingUser.email} został usunięty pomyślnie`
    });

  } catch (error) {
    console.error("Błąd podczas usuwania użytkownika:", error);
    return NextResponse.json(
      { error: "Błąd podczas usuwania użytkownika" },
      { status: 500 }
    );
  }
}
