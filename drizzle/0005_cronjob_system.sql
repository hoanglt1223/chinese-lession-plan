CREATE TABLE "cronjobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"schedule" varchar(100) NOT NULL,
	"last_run" timestamp,
	"next_run" timestamp,
	"total_lessons" integer DEFAULT 0 NOT NULL,
	"processed_lessons" integer DEFAULT 0 NOT NULL,
	"failed_lessons" integer DEFAULT 0 NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cronjobs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "cronjob_lesson_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"unit_number" varchar(50) NOT NULL,
	"lesson_number" varchar(50) NOT NULL,
	"lesson_title" varchar(255) NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"error" text,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cronjobs" ADD CONSTRAINT "cronjobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cronjob_lesson_statuses" ADD CONSTRAINT "cronjob_lesson_statuses_job_id_cronjobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."cronjobs"("id") ON DELETE cascade ON UPDATE no action;