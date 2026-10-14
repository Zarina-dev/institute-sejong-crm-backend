import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditClientInfo1791970939857 implements MigrationInterface {
  name = 'AddAuditClientInfo1791970939857'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "country" character varying(2)`)
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "city" character varying(80)`)
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "device" character varying(120)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "device"`)
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "city"`)
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "country"`)
  }
}
