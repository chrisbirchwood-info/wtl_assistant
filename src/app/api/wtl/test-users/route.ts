import { NextRequest, NextResponse } from "next/server";
import { wtlClient } from "@/lib/wtl-client";

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testuję WTL API - endpoint users...");

    // Test 1: Pobierz użytkowników
    console.log("1️⃣ Próbuję pobrać użytkowników...");
    const usersResponse = await wtlClient.getUsers();
    console.log("Users response:", usersResponse);

    // Test 2: Pobierz użytkowników z rolami
    console.log("2️⃣ Próbuję pobrać użytkowników z rolami...");
    const usersWithRolesResponse = await wtlClient.getUsersWithRoles();
    console.log("Users with roles response:", usersWithRolesResponse);

    // Test 3: Sprawdź dostępne endpointy
    console.log("3️⃣ Sprawdzam dostępne endpointy...");
    const testEndpoints = [
      "/users",
      "/api/users",
      "/v1/users",
      "/user/list",
      "/api/user/list",
      "/v1/user/list",
    ];

    const endpointResults = [];
    for (const endpoint of testEndpoints) {
      try {
        const response = await wtlClient.client.get(endpoint);
        endpointResults.push({
          endpoint,
          status: response.status,
          hasData: !!response.data,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          dataLength: Array.isArray(response.data)
            ? response.data.length
            : "N/A",
        });
      } catch (error: any) {
        endpointResults.push({
          endpoint,
          error: error.response?.status || error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Test WTL API users zakończony",
      results: {
        users: usersResponse,
        usersWithRoles: usersWithRolesResponse,
        endpointTests: endpointResults,
      },
    });
  } catch (error) {
    console.error("❌ Błąd podczas testowania WTL API users:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Błąd podczas testowania WTL API users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
