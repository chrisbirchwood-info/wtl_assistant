-- Migration: Add course_teachers table
-- Date: 2025-08-27 17:00:00

-- Create course_teachers table for managing teacher-course assignments
CREATE TABLE IF NOT EXISTS "public"."course_teachers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "role" character varying(50) DEFAULT 'teacher'::character varying NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT now(),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);
-- Add comments
COMMENT ON TABLE "public"."course_teachers" IS 'Tabela przypisań nauczycieli do kursów';
COMMENT ON COLUMN "public"."course_teachers"."course_id" IS 'ID kursu';
COMMENT ON COLUMN "public"."course_teachers"."teacher_id" IS 'ID nauczyciela';
COMMENT ON COLUMN "public"."course_teachers"."role" IS 'Rola nauczyciela w kursie (teacher, assistant, etc.)';
COMMENT ON COLUMN "public"."course_teachers"."assigned_by" IS 'ID użytkownika, który przypisał nauczyciela';
COMMENT ON COLUMN "public"."course_teachers"."assigned_at" IS 'Data przypisania';
COMMENT ON COLUMN "public"."course_teachers"."is_active" IS 'Czy przypisanie jest aktywne';
-- Set owner
ALTER TABLE "public"."course_teachers" OWNER TO "postgres";
-- Add primary key
ALTER TABLE ONLY "public"."course_teachers"
    ADD CONSTRAINT "course_teachers_pkey" PRIMARY KEY ("id");
-- Add foreign key constraints
ALTER TABLE ONLY "public"."course_teachers"
    ADD CONSTRAINT "course_teachers_course_id_fkey" 
    FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."course_teachers"
    ADD CONSTRAINT "course_teachers_teacher_id_fkey" 
    FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."course_teachers"
    ADD CONSTRAINT "course_teachers_assigned_by_fkey" 
    FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
-- Add unique constraint to prevent duplicate assignments
ALTER TABLE ONLY "public"."course_teachers"
    ADD CONSTRAINT "course_teachers_course_teacher_unique" 
    UNIQUE ("course_id", "teacher_id");
-- Add indexes for better performance
CREATE INDEX "idx_course_teachers_course_id" ON "public"."course_teachers" USING "btree" ("course_id");
CREATE INDEX "idx_course_teachers_teacher_id" ON "public"."course_teachers" USING "btree" ("teacher_id");
CREATE INDEX "idx_course_teachers_is_active" ON "public"."course_teachers" USING "btree" ("is_active");
CREATE INDEX "idx_course_teachers_role" ON "public"."course_teachers" USING "btree" ("role");
-- Add trigger for updated_at
CREATE TRIGGER "update_course_teachers_updated_at" 
    BEFORE UPDATE ON "public"."course_teachers" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
