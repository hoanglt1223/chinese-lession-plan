-- Create projects table for organizing templates
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Create templates table for storing uploaded template files
CREATE TABLE IF NOT EXISTS "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_type" varchar(10) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"content" text,
	"structure" jsonb,
	"storage_url" varchar(500),
	"storage_key" varchar(500),
	"content_hash" varchar(64),
	"uploaded_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "templates_file_type_check" CHECK ((file_type IN ('md','docx')))
);
--> statement-breakpoint
-- Create indexes for templates table
CREATE INDEX IF NOT EXISTS "templates_project_id_idx" ON "templates" ("project_id");
CREATE INDEX IF NOT EXISTS "templates_content_hash_idx" ON "templates" ("content_hash");
CREATE INDEX IF NOT EXISTS "templates_is_deleted_idx" ON "templates" ("is_deleted");
CREATE INDEX IF NOT EXISTS "templates_file_type_idx" ON "templates" ("file_type");
CREATE INDEX IF NOT EXISTS "templates_created_at_idx" ON "templates" ("created_at");
--> statement-breakpoint
-- Create indexes for projects table
CREATE INDEX IF NOT EXISTS "projects_is_active_idx" ON "projects" ("is_active");
CREATE INDEX IF NOT EXISTS "projects_created_by_idx" ON "projects" ("created_by");
--> statement-breakpoint
-- Add foreign key constraints
DO $$ BEGIN
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "templates" ADD CONSTRAINT "templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "templates" ADD CONSTRAINT "templates_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
WHEN duplicate_object THEN null;
END $$;