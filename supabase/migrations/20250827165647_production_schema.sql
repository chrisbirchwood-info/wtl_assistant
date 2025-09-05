SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
COMMENT ON SCHEMA "public" IS 'Tabela user_sessions została usunięta - nadmiarowa w systemie JWT + Zustand. Sesje są zarządzane przez JWT tokens w localStorage.';
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'teacher',
    'superadmin'
);
ALTER TYPE "public"."user_role" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."connection_test" (
    "id" integer NOT NULL,
    "test_name" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."connection_test" OWNER TO "postgres";
COMMENT ON TABLE "public"."connection_test" IS 'Test table for verifying Supabase CLI connection';
CREATE SEQUENCE IF NOT EXISTS "public"."connection_test_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE "public"."connection_test_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."connection_test_id_seq" OWNED BY "public"."connection_test"."id";
CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid",
    "student_id" "uuid",
    "enrollment_date" timestamp with time zone DEFAULT "now"(),
    "status" character varying(50) DEFAULT 'enrolled'::character varying,
    "progress_percentage" integer DEFAULT 0,
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_sync_at" timestamp with time zone DEFAULT "now"(),
    "sync_status" character varying(50) DEFAULT 'synced'::character varying
);
ALTER TABLE "public"."course_enrollments" OWNER TO "postgres";
COMMENT ON TABLE "public"."course_enrollments" IS 'Zapisy studentów na kursy';
COMMENT ON COLUMN "public"."course_enrollments"."student_id" IS 'ID studenta zapisanego na kurs';
CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wtl_course_id" character varying(255) NOT NULL,
    "title" character varying(500) NOT NULL,
    "description" "text",
    "teacher_id" "uuid",
    "status" character varying(50) DEFAULT 'active'::character varying,
    "max_students" integer DEFAULT 50,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_sync_at" timestamp with time zone DEFAULT "now"(),
    "sync_status" character varying(50) DEFAULT 'synced'::character varying
);
ALTER TABLE "public"."courses" OWNER TO "postgres";
COMMENT ON TABLE "public"."courses" IS 'Kursy prowadzone przez nauczycieli';
COMMENT ON COLUMN "public"."courses"."teacher_id" IS 'ID nauczyciela prowadzącego kurs';
CREATE TABLE IF NOT EXISTS "public"."student_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_course_id" character varying(255),
    "progress_percentage" numeric(5,2) DEFAULT 0.00,
    "enrollment_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."student_profiles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wtl_student_id" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "username" character varying(255),
    "first_name" character varying(255),
    "last_name" character varying(255),
    "status" character varying(50) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_sync_at" timestamp with time zone DEFAULT "now"(),
    "sync_status" character varying(50) DEFAULT 'synced'::character varying
);
ALTER TABLE "public"."students" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid",
    "action" character varying(50) NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."sync_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."teacher_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "specialization" "text",
    "experience_years" integer,
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."teacher_profiles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."user_sync_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "wtl_user_id" character varying(255),
    "sync_type" character varying(50),
    "sync_status" character varying(50),
    "user_role" "public"."user_role",
    "last_sync_at" timestamp with time zone DEFAULT "now"(),
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."user_sync_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "username" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "wtl_user_id" character varying(255),
    "wtl_last_sync" timestamp with time zone,
    "wtl_sync_status" character varying(50) DEFAULT 'pending'::character varying,
    "password_hash" character varying(255),
    "is_active" boolean DEFAULT true,
    "first_name" character varying(255),
    "last_name" character varying(255)
);
ALTER TABLE "public"."users" OWNER TO "postgres";
COMMENT ON TABLE "public"."users" IS 'Główna tabela użytkowników. Sesje są zarządzane przez JWT + Zustand, nie przez bazę danych.';
COMMENT ON COLUMN "public"."users"."first_name" IS 'Imię użytkownika';
COMMENT ON COLUMN "public"."users"."last_name" IS 'Nazwisko użytkownika';
ALTER TABLE ONLY "public"."connection_test" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."connection_test_id_seq"'::"regclass");
ALTER TABLE ONLY "public"."connection_test"
    ADD CONSTRAINT "connection_test_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_student_id_key" UNIQUE ("course_id", "student_id");
ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_wtl_course_id_key" UNIQUE ("wtl_course_id");
ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_wtl_student_id_key" UNIQUE ("wtl_student_id");
ALTER TABLE ONLY "public"."sync_log"
    ADD CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_sync_log"
    ADD CONSTRAINT "user_sync_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
CREATE INDEX "idx_connection_test_name" ON "public"."connection_test" USING "btree" ("test_name");
CREATE INDEX "idx_courses_teacher" ON "public"."courses" USING "btree" ("teacher_id");
CREATE INDEX "idx_courses_wtl_id" ON "public"."courses" USING "btree" ("wtl_course_id");
CREATE INDEX "idx_enrollments_course" ON "public"."course_enrollments" USING "btree" ("course_id");
CREATE INDEX "idx_enrollments_student" ON "public"."course_enrollments" USING "btree" ("student_id");
CREATE INDEX "idx_student_profiles_user_id" ON "public"."student_profiles" USING "btree" ("user_id");
CREATE INDEX "idx_students_email" ON "public"."students" USING "btree" ("email");
CREATE INDEX "idx_students_wtl_id" ON "public"."students" USING "btree" ("wtl_student_id");
CREATE INDEX "idx_sync_log_created" ON "public"."sync_log" USING "btree" ("created_at");
CREATE INDEX "idx_sync_log_entity" ON "public"."sync_log" USING "btree" ("entity_type", "entity_id");
CREATE INDEX "idx_teacher_profiles_user_id" ON "public"."teacher_profiles" USING "btree" ("user_id");
CREATE UNIQUE INDEX "idx_teacher_profiles_user_id_unique" ON "public"."teacher_profiles" USING "btree" ("user_id");
COMMENT ON INDEX "public"."idx_teacher_profiles_user_id_unique" IS 'Unikalny indeks na user_id zapobiegający duplikatom';
CREATE INDEX "idx_user_sync_log_status" ON "public"."user_sync_log" USING "btree" ("sync_status");
CREATE INDEX "idx_user_sync_log_user_id" ON "public"."user_sync_log" USING "btree" ("user_id");
CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");
CREATE INDEX "idx_users_first_name" ON "public"."users" USING "btree" ("first_name");
CREATE INDEX "idx_users_is_active" ON "public"."users" USING "btree" ("is_active");
CREATE INDEX "idx_users_last_name" ON "public"."users" USING "btree" ("last_name");
CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");
CREATE INDEX "idx_users_wtl_id" ON "public"."users" USING "btree" ("wtl_user_id");
CREATE INDEX "idx_users_wtl_user_id" ON "public"."users" USING "btree" ("wtl_user_id");
CREATE OR REPLACE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_enrollments_updated_at" BEFORE UPDATE ON "public"."course_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_student_profiles_updated_at" BEFORE UPDATE ON "public"."student_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_students_updated_at" BEFORE UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_teacher_profiles_updated_at" BEFORE UPDATE ON "public"."teacher_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_sync_log"
    ADD CONSTRAINT "user_sync_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
GRANT ALL ON TABLE "public"."connection_test" TO "anon";
GRANT ALL ON TABLE "public"."connection_test" TO "authenticated";
GRANT ALL ON TABLE "public"."connection_test" TO "service_role";
GRANT ALL ON SEQUENCE "public"."connection_test_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."connection_test_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."connection_test_id_seq" TO "service_role";
GRANT ALL ON TABLE "public"."course_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."course_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_enrollments" TO "service_role";
GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";
GRANT ALL ON TABLE "public"."student_profiles" TO "anon";
GRANT ALL ON TABLE "public"."student_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."student_profiles" TO "service_role";
GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";
GRANT ALL ON TABLE "public"."sync_log" TO "anon";
GRANT ALL ON TABLE "public"."sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_log" TO "service_role";
GRANT ALL ON TABLE "public"."teacher_profiles" TO "anon";
GRANT ALL ON TABLE "public"."teacher_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_profiles" TO "service_role";
GRANT ALL ON TABLE "public"."user_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."user_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sync_log" TO "service_role";
GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
RESET ALL;
