CREATE TABLE "enhanced_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_template_id" uuid,
	"sample_output" text NOT NULL,
	"format_structure" jsonb NOT NULL,
	"quality_score" numeric(3, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"average_match_score" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"template_id" uuid,
	"lesson_id" uuid,
	"type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"unit" integer NOT NULL,
	"lesson" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"format_match_score" numeric(5, 2) DEFAULT '0.00',
	"used_templates" jsonb DEFAULT '[]'::jsonb,
	"language" varchar(10) DEFAULT 'zh' NOT NULL,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"generation_type" varchar(50) NOT NULL,
	"model_used" varchar(50) NOT NULL,
	"overall_score" numeric(3, 2) NOT NULL,
	"format_accuracy" numeric(3, 2) NOT NULL,
	"content_quality" numeric(3, 2) NOT NULL,
	"completeness" numeric(3, 2) NOT NULL,
	"consistency" numeric(3, 2) NOT NULL,
	"generation_time" integer NOT NULL,
	"retries" integer DEFAULT 0 NOT NULL,
	"variables" jsonb,
	"validation_issues" jsonb,
	"template_match_score" numeric(3, 2),
	"user_feedback" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "template_analysis_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid,
	"template_id" uuid,
	"analysis_type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"analysis_data" jsonb NOT NULL,
	"quality_score" numeric(5, 2),
	"recommendations" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_1_id" uuid,
	"template_2_id" uuid,
	"comparison_data" jsonb NOT NULL,
	"similarity_score" numeric(5, 2) NOT NULL,
	"winner_id" uuid,
	"comparison_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"generation_type" varchar(50) NOT NULL,
	"total_generations" integer DEFAULT 0 NOT NULL,
	"average_score" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"average_format_accuracy" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"average_generation_time" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"last_used" timestamp,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_quality_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid,
	"template_id" uuid,
	"completeness" numeric(5, 2) NOT NULL,
	"consistency" numeric(5, 2) NOT NULL,
	"readability" numeric(5, 2) NOT NULL,
	"structure" numeric(5, 2) NOT NULL,
	"overall" numeric(5, 2) NOT NULL,
	"issues_count" integer DEFAULT 0 NOT NULL,
	"variables_count" integer DEFAULT 0 NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_usage_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"lesson_id" uuid,
	"user_id" uuid,
	"usage_type" varchar(50) NOT NULL,
	"action_data" jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text,
	"filename" varchar(255),
	"original_name" varchar(255),
	"file_type" varchar(10),
	"file_size" integer,
	"mime_type" varchar(100),
	"content" text,
	"structure" jsonb,
	"storage_url" varchar(500),
	"storage_key" varchar(500),
	"content_hash" varchar(64),
	"variables" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"quality_score" numeric(5, 2) DEFAULT '0.00',
	"uploaded_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_processed" boolean DEFAULT false NOT NULL,
	"processing_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "language" varchar(10) DEFAULT 'zh' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "is_generic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enhanced_templates" ADD CONSTRAINT "enhanced_templates_base_template_id_prompt_templates_id_fk" FOREIGN KEY ("base_template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_metrics" ADD CONSTRAINT "generation_metrics_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_analyses" ADD CONSTRAINT "template_analyses_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_analysis_results" ADD CONSTRAINT "template_analysis_results_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_analysis_results" ADD CONSTRAINT "template_analysis_results_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_comparisons" ADD CONSTRAINT "template_comparisons_template_1_id_prompt_templates_id_fk" FOREIGN KEY ("template_1_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_comparisons" ADD CONSTRAINT "template_comparisons_template_2_id_prompt_templates_id_fk" FOREIGN KEY ("template_2_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_comparisons" ADD CONSTRAINT "template_comparisons_winner_id_prompt_templates_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_performance" ADD CONSTRAINT "template_performance_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_quality_metrics" ADD CONSTRAINT "template_quality_metrics_analysis_id_template_analysis_results_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."template_analysis_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_quality_metrics" ADD CONSTRAINT "template_quality_metrics_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_usage_analytics" ADD CONSTRAINT "template_usage_analytics_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_usage_analytics" ADD CONSTRAINT "template_usage_analytics_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_usage_analytics" ADD CONSTRAINT "template_usage_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;