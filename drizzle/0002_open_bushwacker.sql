CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'game' NOT NULL,
	"description" text,
	"instructions" text,
	"duration" varchar(50),
	"age_group" varchar(100),
	"materials" jsonb,
	"benefits" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "activities_name_unique" UNIQUE("name")
);
