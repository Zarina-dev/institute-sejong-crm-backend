import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditLog1791375233441 implements MigrationInterface {
  name = 'AddAuditLog1791375233441'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actor" character varying(120) NOT NULL, "action" character varying(20) NOT NULL, "entity_type" character varying(40), "entity_id" character varying(80), "label" character varying(300) NOT NULL DEFAULT '', "changes" jsonb NOT NULL DEFAULT '[]', "ip" character varying(64), CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "idx_audit_entity" ON "audit_log" ("entity_type", "entity_id") `)
    await queryRunner.query(`CREATE INDEX "idx_audit_at" ON "audit_log" ("at") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_audit_at"`)
    await queryRunner.query(`DROP INDEX "public"."idx_audit_entity"`)
    await queryRunner.query(`DROP TABLE "audit_log"`)
  }
}
