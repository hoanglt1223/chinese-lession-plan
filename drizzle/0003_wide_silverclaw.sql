CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"input_format" varchar(50) DEFAULT 'text' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"user_id" uuid NOT NULL,
	"template_count" integer DEFAULT 0 NOT NULL,
	"lesson_count" integer DEFAULT 0 NOT NULL,
	"settings" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
