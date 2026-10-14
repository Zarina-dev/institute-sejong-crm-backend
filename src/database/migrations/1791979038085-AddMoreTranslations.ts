import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMoreTranslations1791979038085 implements MigrationInterface {
  name = 'AddMoreTranslations1791979038085'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "textbooks" ADD "translations" jsonb NOT NULL DEFAULT '{}'`)
    await queryRunner.query(`ALTER TABLE "news_posts" ADD "translations" jsonb NOT NULL DEFAULT '{}'`)
    await queryRunner.query(`ALTER TABLE "courses" ADD "translations" jsonb NOT NULL DEFAULT '{}'`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "translations"`)
    await queryRunner.query(`ALTER TABLE "news_posts" DROP COLUMN "translations"`)
    await queryRunner.query(`ALTER TABLE "textbooks" DROP COLUMN "translations"`)
  }
}
