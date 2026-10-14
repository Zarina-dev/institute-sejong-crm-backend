import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGraduates1791976572587 implements MigrationInterface {
  name = 'AddGraduates1791976572587'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "graduates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "year" integer NOT NULL, "term" integer NOT NULL, "name" character varying(150) NOT NULL DEFAULT '', "nameKy" character varying(150) NOT NULL DEFAULT '', "note" character varying(255) NOT NULL DEFAULT '', "noteKy" character varying(255) NOT NULL DEFAULT '', "isPublished" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_264f3944ca36603aa1da616f5dd" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_graduates_order" ON "graduates" ("year", "term", "created_at") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_graduates_order"`)
    await queryRunner.query(`DROP TABLE "graduates"`)
  }
}
