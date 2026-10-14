import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTranslations1791978414210 implements MigrationInterface {
  name = 'AddTranslations1791978414210'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "staff_members" ADD "translations" jsonb NOT NULL DEFAULT '{}'`)
    await queryRunner.query(`ALTER TABLE "competitions" ADD "translations" jsonb NOT NULL DEFAULT '{}'`)
    await queryRunner.query(`ALTER TABLE "chronology_entries" ADD "translations" jsonb NOT NULL DEFAULT '{}'`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chronology_entries" DROP COLUMN "translations"`)
    await queryRunner.query(`ALTER TABLE "competitions" DROP COLUMN "translations"`)
    await queryRunner.query(`ALTER TABLE "staff_members" DROP COLUMN "translations"`)
  }
}
