import { supabase } from "./supabase";
import { wtlClient, WTLUserWithRole } from "./wtl-client";

export interface SyncResult {
  success: boolean;
  action: "created" | "updated" | "synced" | "error" | "not_found_in_wtl";
  user?: any;
  error?: string;
}

export interface BulkSyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}

export class UserSyncService {
  /**
   * Synchronizuje pojedynczego użytkownika z określeniem roli
   */
  async syncUser(email: string): Promise<SyncResult> {
    try {
      console.log(`🔄 Starting sync for user: ${email}`);

      // 1. Sprawdź użytkownika w WTL z rolą
      console.log(`🔍 Verifying user in WTL: ${email}`);
      const wtlUser = await wtlClient.verifyUserWithRole(email);

      if (wtlUser.success && wtlUser.data) {
        console.log(
          `✅ User verified in WTL: ${email}, role: ${wtlUser.data.role}`
        );

        // 2. Zaktualizuj/utwórz użytkownika w Supabase
        console.log(`🔄 Upserting user in Supabase: ${email}`);
        const supabaseUser = await this.upsertUserFromWTL(wtlUser.data);

        // 3. Zaktualizuj profil odpowiedni dla roli
        console.log(`🔄 Updating user profile: ${email}`);
        await this.updateUserProfile(supabaseUser.id, wtlUser.data);

        // 4. Zaloguj synchronizację
        console.log(`📝 Logging sync event: ${email}`);
        await this.logSyncEvent(
          supabaseUser.id,
          "update",
          "success",
          wtlUser.data.role
        );

        console.log(`✅ Sync completed successfully for: ${email}`);
        return {
          success: true,
          action: "synced",
          user: supabaseUser,
        };
      } else {
        console.log(`❌ User not found in WTL: ${email}`);

        // 5. Użytkownik nie istnieje w WTL
        await this.markUserAsUnsynced(email);
        await this.logSyncEvent(
          null,
          "verify",
          "failed",
          "student",
          `User not found: ${email}`
        );

        return {
          success: false,
          action: "not_found_in_wtl",
        };
      }
    } catch (error: any) {
      console.error(`❌ Sync error for ${email}:`, error);
      await this.logSyncEvent(null, "sync", "error", "student", error.message);

      return {
        success: false,
        action: "error",
        error: error.message,
      };
    }
  }

  /**
   * Synchronizacja masowa wszystkich użytkowników
   */
  async syncAllUsers(): Promise<BulkSyncResult> {
    try {
      console.log("🔄 Starting bulk user synchronization...");

      // 1. Pobierz wszystkich użytkowników z WTL z rolami
      const wtlUsers = await wtlClient.getUsersWithRoles();

      if (!wtlUsers.success) {
        throw new Error("Failed to fetch WTL users");
      }

      console.log(`📊 Found ${wtlUsers.data.length} users in WTL`);

      // 2. Synchronizuj każdego użytkownika
      const results = await Promise.allSettled(
        wtlUsers.data.map((user) => this.syncUser(user.email))
      );

      // 3. Przetwórz wyniki
      const synced = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;
      const failed = results.filter(
        (r) => r.status === "rejected" || !r.value?.success
      ).length;
      const errors = results
        .filter((r) => r.status === "rejected" || !r.value?.success)
        .map((r) =>
          r.status === "rejected" ? r.reason?.message : r.value?.error
        )
        .filter(Boolean);

      console.log(`✅ Bulk sync completed: ${synced} synced, ${failed} failed`);

      return {
        total: wtlUsers.data.length,
        synced,
        failed,
        errors,
      };
    } catch (error: any) {
      console.error("Bulk sync error:", error);
      throw error;
    }
  }

  /**
   * Synchronizacja użytkowników określonej roli
   */
  async syncUsersByRole(
    role: "student" | "teacher" | "superadmin"
  ): Promise<BulkSyncResult> {
    try {
      console.log(`🔄 Starting sync for role: ${role}`);

      // 1. Pobierz użytkowników z WTL
      const wtlUsers = await wtlClient.getUsersWithRoles();

      if (!wtlUsers.success) {
        throw new Error("Failed to fetch WTL users");
      }

      // 2. Filtruj użytkowników po roli
      const usersWithRole = wtlUsers.data.filter((user) => user.role === role);

      console.log(`📊 Found ${usersWithRole.length} ${role}s in WTL`);

      // 3. Synchronizuj użytkowników określonej roli
      const results = await Promise.allSettled(
        usersWithRole.map((user) => this.syncUser(user.email))
      );

      // 4. Przetwórz wyniki
      const synced = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;
      const failed = results.filter(
        (r) => r.status === "rejected" || !r.value?.success
      ).length;
      const errors = results
        .filter((r) => r.status === "rejected" || !r.value?.success)
        .map((r) =>
          r.status === "rejected" ? r.reason?.message : r.value?.error
        )
        .filter(Boolean);

      return {
        total: usersWithRole.length,
        synced,
        failed,
        errors,
      };
    } catch (error: any) {
      console.error(`Role sync error for ${role}:`, error);
      throw error;
    }
  }

  /**
   * Synchronizuje wszystkich użytkowników z WTL API
   */
  async syncAllUsersFromWTL(): Promise<any> {
    try {
      console.log(
        "🔄 Rozpoczynam synchronizację wszystkich użytkowników z WTL..."
      );

      // Pobierz wszystkich użytkowników z WTL
      const wtlUsers = await wtlClient.getUsers();

      if (!wtlUsers || !wtlUsers.success || !Array.isArray(wtlUsers.data)) {
        console.log("⚠️ Brak użytkowników z WTL lub nieprawidłowa odpowiedź");
        return { success: false, message: "Brak użytkowników z WTL" };
      }

      console.log(`📊 Znaleziono ${wtlUsers.data.length} użytkowników w WTL`);

      const results = {
        total: wtlUsers.data.length,
        created: 0,
        updated: 0,
        errors: 0,
        details: [] as Array<{
          email: string;
          action: string;
          success?: boolean;
          error?: string;
        }>,
      };

      // Synchronizuj każdego użytkownika
      for (const wtlUser of wtlUsers.data) {
        try {
          console.log(
            `🔄 Synchronizuję użytkownika: ${wtlUser.email || wtlUser.id}`
          );

          // Sprawdź czy użytkownik istnieje w Supabase
          const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .eq("email", wtlUser.email)
            .single();

          if (existingUser) {
            // Aktualizuj istniejącego użytkownika
            const { error: updateError } = await supabase
              .from("users")
              .update({
                wtl_user_id: wtlUser.id,
                wtl_last_sync: new Date().toISOString(),
                wtl_sync_status: "synced",
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingUser.id);

            if (updateError) {
              console.error(
                `❌ Błąd aktualizacji użytkownika ${wtlUser.email}:`,
                updateError
              );
              results.errors++;
              results.details.push({
                email: wtlUser.email,
                action: "update",
                error: updateError.message,
              });
            } else {
              console.log(`✅ Zaktualizowano użytkownika: ${wtlUser.email}`);
              results.updated++;
              results.details.push({
                email: wtlUser.email,
                action: "update",
                success: true,
              });
            }
          } else {
            // Utwórz nowego użytkownika
            const { error: createError } = await supabase.from("users").insert([
              {
                email: wtlUser.email,
                username: wtlUser.email?.split("@")[0] || `user_${wtlUser.id}`,
                role: "student", // Domyślnie student
                wtl_user_id: wtlUser.id,
                wtl_last_sync: new Date().toISOString(),
                wtl_sync_status: "synced",
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

            if (createError) {
              console.error(
                `❌ Błąd tworzenia użytkownika ${wtlUser.email}:`,
                createError
              );
              results.errors++;
              results.details.push({
                email: wtlUser.email,
                action: "create",
                error: createError.message,
              });
            } else {
              console.log(`✅ Utworzono nowego użytkownika: ${wtlUser.email}`);
              results.created++;
              results.details.push({
                email: wtlUser.email,
                action: "create",
                success: true,
              });
            }
          }

          // Zapisz log synchronizacji
          await this.logSyncEvent(
            null,
            "bulk_sync",
            "success",
            "student",
            `Synchronizacja z WTL: ${wtlUser.email}`
          );
        } catch (userError) {
          console.error(
            `❌ Błąd podczas synchronizacji użytkownika ${wtlUser.email}:`,
            userError
          );
          results.errors++;
          results.details.push({
            email: wtlUser.email,
            action: "sync",
            error:
              userError instanceof Error ? userError.message : "Unknown error",
          });
        }
      }

      console.log(
        `✅ Synchronizacja zakończona: ${results.created} utworzonych, ${results.updated} zaktualizowanych, ${results.errors} błędów`
      );

      return {
        success: true,
        message: `Synchronizacja zakończona: ${results.created} utworzonych, ${results.updated} zaktualizowanych, ${results.errors} błędów`,
        results: results,
      };
    } catch (error) {
      console.error(
        "❌ Błąd podczas synchronizacji wszystkich użytkowników z WTL:",
        error
      );
      return {
        success: false,
        message: "Błąd podczas synchronizacji z WTL",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Aktualizuje lub tworzy użytkownika w Supabase na podstawie danych z WTL
   */
  private async upsertUserFromWTL(wtlUser: WTLUserWithRole) {
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", wtlUser.email)
      .single();

    if (existingUser) {
      // Aktualizuj istniejącego użytkownika - NIE zmieniaj roli
      const { data: updatedUser, error } = await supabase
        .from("users")
        .update({
          username: wtlUser.name,
          wtl_user_id: wtlUser.id,
          wtl_last_sync: new Date().toISOString(),
          wtl_sync_status: "synced",
          // NIE aktualizuj roli - zachowaj obecną
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (error) throw error;
      return updatedUser;
    } else {
      // Utwórz nowego użytkownika - ustaw rolę z WTL
      const userData = {
        email: wtlUser.email,
        username: wtlUser.name,
        role: wtlUser.role, // Tylko dla nowych użytkowników
        wtl_user_id: wtlUser.id,
        wtl_last_sync: new Date().toISOString(),
        wtl_sync_status: "synced",
      };

      const { data: newUser, error } = await supabase
        .from("users")
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return newUser;
    }
  }

  /**
   * Aktualizuje profil użytkownika odpowiedni dla roli
   */
  private async updateUserProfile(userId: string, wtlUser: WTLUserWithRole) {
    if (wtlUser.role === "teacher") {
      // Aktualizuj profil nauczyciela
      await supabase.from("teacher_profiles").upsert({
        user_id: userId,
        // Dodaj więcej pól specyficznych dla nauczycieli
      });
    } else {
      // Aktualizuj profil kursanta
      await supabase.from("student_profiles").upsert({
        user_id: userId,
        // Dodaj więcej pól specyficznych dla kursantów
      });
    }
  }

  /**
   * Loguje zdarzenie synchronizacji
   */
  private async logSyncEvent(
    userId: string | null,
    syncType: string,
    status: string,
    userRole: "student" | "teacher" | "superadmin",
    errorMessage?: string
  ) {
    await supabase.from("user_sync_log").insert({
      user_id: userId,
      sync_type: syncType,
      sync_status: status,
      user_role: userRole,
      error_message: errorMessage,
    });
  }

  /**
   * Oznacza użytkownika jako niezsynchronizowanego
   */
  private async markUserAsUnsynced(email: string) {
    await supabase
      .from("users")
      .update({
        wtl_sync_status: "failed",
        wtl_last_sync: new Date().toISOString(),
      })
      .eq("email", email);
  }

  /**
   * Pobiera statystyki synchronizacji
   */
  async getSyncStats(): Promise<any> {
    const { data: syncLogs } = await supabase
      .from("user_sync_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: users } = await supabase
      .from("users")
      .select("wtl_sync_status, role");

    const stats = {
      totalUsers: users?.length || 0,
      syncedUsers:
        users?.filter((u) => u.wtl_sync_status === "synced").length || 0,
      failedUsers:
        users?.filter((u) => u.wtl_sync_status === "failed").length || 0,
      pendingUsers:
        users?.filter((u) => u.wtl_sync_status === "pending").length || 0,
      students: users?.filter((u) => u.role === "student").length || 0,
      teachers: users?.filter((u) => u.role === "teacher").length || 0,
      recentSyncs: syncLogs || [],
    };

    return stats;
  }

  /**
   * Pobiera statystyki synchronizacji dla określonej roli
   */
  async getSyncStatsByRole(
    role: "student" | "teacher" | "superadmin"
  ): Promise<any> {
    const { data: syncLogs } = await supabase
      .from("user_sync_log")
      .select("*")
      .eq("user_role", role)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: users } = await supabase
      .from("users")
      .select("wtl_sync_status")
      .eq("role", role);

    const stats = {
      role,
      totalUsers: users?.length || 0,
      syncedUsers:
        users?.filter((u) => u.wtl_sync_status === "synced").length || 0,
      failedUsers:
        users?.filter((u) => u.wtl_sync_status === "failed").length || 0,
      pendingUsers:
        users?.filter((u) => u.wtl_sync_status === "pending").length || 0,
      recentSyncs: syncLogs || [],
    };

    return stats;
  }
}
