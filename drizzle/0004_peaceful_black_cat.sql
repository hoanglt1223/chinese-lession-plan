CREATE TABLE "enhanced_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"template_id" uuid,
	"unit" integer NOT NULL,
	"lesson" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"format_match_score" numeric(5, 2) DEFAULT '0.00',
	"used_templates" jsonb DEFAULT '[]'::jsonb,
	"language" varchar(10) DEFAULT 'zh' NOT NULL,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "language_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"language_name" varchar(100) NOT NULL,
	"direction" varchar(3) DEFAULT 'ltr' NOT NULL,
	"ai_prompts" jsonb DEFAULT '{}'::jsonb,
	"cultural_settings" jsonb DEFAULT '{}'::jsonb,
	"formatting" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "language_configs_language_code_unique" UNIQUE("language_code")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"language" varchar(10) DEFAULT 'zh' NOT NULL,
	"input_format" varchar(50) DEFAULT 'excel' NOT NULL,
	"user_id" uuid,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"template_count" integer DEFAULT 0 NOT NULL,
	"lesson_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"analysis_version" varchar(20) DEFAULT '1.0' NOT NULL,
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb,
	"tables" jsonb DEFAULT '[]'::jsonb,
	"headers" jsonb DEFAULT '[]'::jsonb,
	"detected_variables" jsonb DEFAULT '[]'::jsonb,
	"variable_patterns" jsonb DEFAULT '[]'::jsonb,
	"markdown_style" varchar(50),
	"table_format" varchar(50),
	"language_patterns" jsonb DEFAULT '[]'::jsonb,
	"completeness_score" numeric(5, 2) DEFAULT '0.00',
	"consistency_score" numeric(5, 2) DEFAULT '0.00',
	"complexity_score" numeric(5, 2) DEFAULT '0.00',
	"analyzer_config" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'lesson_plan' NOT NULL,
	"description" text,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500),
	"file_size" integer,
	"file_type" varchar(50),
	"file_content" text,
	"processed_content" jsonb,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"structure" jsonb DEFAULT '{}'::jsonb,
	"quality_score" numeric(5, 2) DEFAULT '0.00',
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_processed" boolean DEFAULT false NOT NULL,
	"processing_status" varchar(50) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "language" varchar(10) DEFAULT 'zh' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "is_generic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enhanced_lessons" ADD CONSTRAINT "enhanced_lessons_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enhanced_lessons" ADD CONSTRAINT "enhanced_lessons_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_analyses" ADD CONSTRAINT "template_analyses_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;