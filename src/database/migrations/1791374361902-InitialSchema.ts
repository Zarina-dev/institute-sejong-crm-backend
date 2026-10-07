import { MigrationInterface, QueryRunner } from 'typeorm'

/** Every table the entities define, as the baseline creates them. */
const TABLES = [
  'textbooks',
  'academic_terms',
  'study_abroad',
  'staff_members',
  'news_posts',
  'meeting_minutes',
  'courses',
  'learning_materials',
  'gallery_albums',
  'schedule_events',
  'site_content',
  'chronology_entries',
  'competitions',
]

/**
 * The schema as it stood when the project moved from synchronize to
 * migrations (2026-10-07), generated from the entities against an empty
 * database. Later changes are migrations of their own.
 */
export class InitialSchema1791374361902 implements MigrationInterface {
  name = 'InitialSchema1791374361902'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Databases from before migrations already have this schema — synchronize
    // built it from the same entities. Then there is nothing to create: the
    // migration is only recorded as run. A database holding some of these
    // tables but not all is not one this migration knows; stop rather than guess.
    // One at a time: a migration runs on a single connection.
    const existing: boolean[] = []
    for (const table of TABLES) {
      existing.push(await queryRunner.hasTable(table))
    }
    if (existing.every(Boolean)) {
      return
    }
    if (existing.some(Boolean)) {
      const present = TABLES.filter((_, index) => existing[index])
      throw new Error(
        `InitialSchema: the database holds only some of its tables (${present.join(', ')}). Restore a complete database or start from an empty one.`,
      )
    }

    // uuid_generate_v4() for the primary keys.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    await queryRunner.query(
      `CREATE TABLE "textbooks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text NOT NULL DEFAULT '', "coverImage" character varying(500), "purchasePlace" character varying(255) NOT NULL DEFAULT '', "purchaseUrl" character varying(500), "sortOrder" integer NOT NULL DEFAULT '0', "isPublished" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_9eca826babdc2aac3dd8534ad69" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_textbook_order" ON "textbooks" ("isPublished", "sortOrder") `)
    await queryRunner.query(
      `CREATE TABLE "academic_terms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(20) NOT NULL, "year" integer NOT NULL, "kind" character varying(20) NOT NULL DEFAULT 'first', "season" character varying(10), "name" character varying(120) NOT NULL DEFAULT '', "startDate" character varying(20) NOT NULL, "endDate" character varying(20) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_1440ed092c70addfe5d5257e364" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_term_code" ON "academic_terms" ("code") WHERE "deleted_at" IS NULL`)
    await queryRunner.query(
      `CREATE TABLE "study_abroad" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "year" integer NOT NULL, "name" character varying(150) NOT NULL DEFAULT '', "nameKy" character varying(150) NOT NULL DEFAULT '', "university" character varying(255) NOT NULL DEFAULT '', "universityKy" character varying(255) NOT NULL DEFAULT '', "major" character varying(255) NOT NULL DEFAULT '', "majorKy" character varying(255) NOT NULL DEFAULT '', "programme" character varying(255) NOT NULL DEFAULT '', "programmeKy" character varying(255) NOT NULL DEFAULT '', "duration" character varying(60) NOT NULL DEFAULT '', "durationKy" character varying(60) NOT NULL DEFAULT '', "photo" character varying(500), "note" character varying(255) NOT NULL DEFAULT '', "noteKy" character varying(255) NOT NULL DEFAULT '', "isPublished" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_3d227e521b9dae3a4592d66ddcd" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_study_abroad_order" ON "study_abroad" ("year", "created_at") `)
    await queryRunner.query(
      `CREATE TABLE "staff_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "position" character varying(160) NOT NULL, "bio" text NOT NULL DEFAULT '', "photoUrl" character varying(500), "email" character varying(255), "sortOrder" integer NOT NULL DEFAULT '0', "startDate" character varying(10), "endDate" character varying(10), "isCurrent" boolean NOT NULL DEFAULT true, "isPublished" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_cdad75efe024402db5d51140960" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_staff_order" ON "staff_members" ("isPublished", "sortOrder") `)
    await queryRunner.query(
      `CREATE TABLE "news_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "body" text NOT NULL, "coverImage" character varying(500), "category" character varying(40) NOT NULL DEFAULT 'campus', "isPublished" boolean NOT NULL DEFAULT false, "publishedAt" TIMESTAMP WITH TIME ZONE, "isFeatured" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_95a44578e2b4bb7ca42e3ef4de6" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_news_published_at" ON "news_posts" ("isPublished", "publishedAt") `)
    await queryRunner.query(
      `CREATE TABLE "meeting_minutes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "method" character varying(100) NOT NULL DEFAULT '', "place" character varying(200) NOT NULL DEFAULT '', "drafter" character varying(120) NOT NULL DEFAULT '', "approver" character varying(120) NOT NULL DEFAULT '', "attendeeList" jsonb NOT NULL DEFAULT '[]', "heldOn" character varying(20) NOT NULL, "attendees" character varying(500) NOT NULL DEFAULT '', "body" text NOT NULL DEFAULT '', "decisions" text NOT NULL DEFAULT '', "attachments" jsonb NOT NULL DEFAULT '[]', "original" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_131d742848db3ee132d63b25ecd" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_meeting_held_on" ON "meeting_minutes" ("heldOn") `)
    await queryRunner.query(
      `CREATE TABLE "courses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text, "subject" character varying(120) NOT NULL, "category" character varying(20) NOT NULL DEFAULT 'language', "level" character varying(120), "teacherName" character varying(150), "sessions" jsonb NOT NULL DEFAULT '[]', "classroom" character varying(120), "courseCode" character varying(120), "term" character varying(20), "followsTerm" boolean, "startDate" character varying(20), "endDate" character varying(20), "capacity" integer NOT NULL DEFAULT '0', "expectedStudents" integer, "actualStudents" integer, "totalHours" real, "weeklyHours" real, "isPublished" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_3f70a487cc718ad8eda4e6d58c9" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_course_end_date" ON "courses" ("endDate") `)
    await queryRunner.query(`CREATE INDEX "IDX_da5e61f3ca4cc8ef1e293fea23" ON "courses" ("isPublished") `)
    await queryRunner.query(`CREATE INDEX "idx_course_term_category" ON "courses" ("term", "category") `)
    await queryRunner.query(
      `CREATE TABLE "learning_materials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text, "courseId" uuid, "subject" character varying(120) NOT NULL, "course" character varying(120) NOT NULL, "level" character varying(120), "materialType" character varying(80), "storageKey" character varying(255), "originalFileName" character varying(255), "fileType" character varying(120), "fileSize" bigint, "thumbnailUrl" character varying(255), "isPublished" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_ae1ef944b64d9645383c5cc6da0" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "IDX_485fe40498ebc8af8282707d72" ON "learning_materials" ("courseId") `)
    await queryRunner.query(`CREATE INDEX "IDX_4f6fbc98cbba9124aa3311b946" ON "learning_materials" ("subject") `)
    await queryRunner.query(`CREATE INDEX "IDX_d6b95146970bd54e9663596515" ON "learning_materials" ("course") `)
    await queryRunner.query(`CREATE INDEX "idx_material_published_updated" ON "learning_materials" ("isPublished", "updated_at") `)
    await queryRunner.query(
      `CREATE TABLE "gallery_albums" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "year" integer NOT NULL, "title" character varying(255) NOT NULL, "eventTag" character varying(40) NOT NULL DEFAULT 'other', "description" text NOT NULL DEFAULT '', "albumUrl" character varying(500), "coverImage" character varying(500), "images" jsonb NOT NULL DEFAULT '[]', "heldOn" character varying(20), "isPublished" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fe2edc1b9abda19559a9bf1df8d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_album_year" ON "gallery_albums" ("isPublished", "year") `)
    await queryRunner.query(
      `CREATE TABLE "schedule_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "termCode" character varying(20), "startDate" character varying(20) NOT NULL, "endDate" character varying(20), "title" character varying(255) NOT NULL, "titleKy" character varying(255) NOT NULL DEFAULT '', "titleRu" character varying(255) NOT NULL DEFAULT '', "titleEn" character varying(255) NOT NULL DEFAULT '', "note" character varying(255) NOT NULL DEFAULT '', "isPublished" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_c14624cf0aa0f238ace86e789aa" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_event_term" ON "schedule_events" ("termCode", "startDate") `)
    await queryRunner.query(
      `CREATE TABLE "site_content" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying(60) NOT NULL, "locale" character varying(5) NOT NULL, "title" character varying(255) NOT NULL DEFAULT '', "body" text NOT NULL DEFAULT '', "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a1362a1a095ab41c4347aea2c2d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_content_slug_locale" ON "site_content" ("slug", "locale") `)
    await queryRunner.query(
      `CREATE TABLE "chronology_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "year" integer NOT NULL, "month" integer, "day" integer, "title" character varying(255) NOT NULL, "description" text NOT NULL DEFAULT '', "isMilestone" boolean NOT NULL DEFAULT false, "isPublished" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_6b09ad2849cda4ac192a2213158" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_chronology_order" ON "chronology_entries" ("year", "month", "day") `)
    await queryRunner.query(
      `CREATE TABLE "competitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kind" character varying(60) NOT NULL, "title" character varying(255) NOT NULL, "year" integer NOT NULL, "heldOn" character varying(20), "venue" character varying(255) NOT NULL DEFAULT '', "participants" integer, "summary" text NOT NULL DEFAULT '', "winners" jsonb NOT NULL DEFAULT '[]', "coverImage" character varying(500), "images" jsonb NOT NULL DEFAULT '[]', "albumUrl" character varying(500), "isPublished" boolean NOT NULL DEFAULT true, "sourceAlbumId" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_ef273910798c3a542b475e75c7d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_competition_kind_year" ON "competitions" ("kind", "year") `)
    await queryRunner.query(
      `ALTER TABLE "learning_materials" ADD CONSTRAINT "FK_485fe40498ebc8af8282707d724" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "learning_materials" DROP CONSTRAINT "FK_485fe40498ebc8af8282707d724"`)
    await queryRunner.query(`DROP INDEX "public"."idx_competition_kind_year"`)
    await queryRunner.query(`DROP TABLE "competitions"`)
    await queryRunner.query(`DROP INDEX "public"."idx_chronology_order"`)
    await queryRunner.query(`DROP TABLE "chronology_entries"`)
    await queryRunner.query(`DROP INDEX "public"."idx_content_slug_locale"`)
    await queryRunner.query(`DROP TABLE "site_content"`)
    await queryRunner.query(`DROP INDEX "public"."idx_event_term"`)
    await queryRunner.query(`DROP TABLE "schedule_events"`)
    await queryRunner.query(`DROP INDEX "public"."idx_album_year"`)
    await queryRunner.query(`DROP TABLE "gallery_albums"`)
    await queryRunner.query(`DROP INDEX "public"."idx_material_published_updated"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_d6b95146970bd54e9663596515"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_4f6fbc98cbba9124aa3311b946"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_485fe40498ebc8af8282707d72"`)
    await queryRunner.query(`DROP TABLE "learning_materials"`)
    await queryRunner.query(`DROP INDEX "public"."idx_course_term_category"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_da5e61f3ca4cc8ef1e293fea23"`)
    await queryRunner.query(`DROP INDEX "public"."idx_course_end_date"`)
    await queryRunner.query(`DROP TABLE "courses"`)
    await queryRunner.query(`DROP INDEX "public"."idx_meeting_held_on"`)
    await queryRunner.query(`DROP TABLE "meeting_minutes"`)
    await queryRunner.query(`DROP INDEX "public"."idx_news_published_at"`)
    await queryRunner.query(`DROP TABLE "news_posts"`)
    await queryRunner.query(`DROP INDEX "public"."idx_staff_order"`)
    await queryRunner.query(`DROP TABLE "staff_members"`)
    await queryRunner.query(`DROP INDEX "public"."idx_study_abroad_order"`)
    await queryRunner.query(`DROP TABLE "study_abroad"`)
    await queryRunner.query(`DROP INDEX "public"."idx_term_code"`)
    await queryRunner.query(`DROP TABLE "academic_terms"`)
    await queryRunner.query(`DROP INDEX "public"."idx_textbook_order"`)
    await queryRunner.query(`DROP TABLE "textbooks"`)
  }
}
