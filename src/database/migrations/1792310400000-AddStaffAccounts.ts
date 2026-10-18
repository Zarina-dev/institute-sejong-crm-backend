import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Sign-in accounts for the admin panel (replaces ADMIN_USERNAME /
 * ADMIN_PASSWORD). Additive only: no existing table is touched. The table
 * starts empty — the first administrator is made with `npm run admin:create`.
 */
export class AddStaffAccounts1792310400000 implements MigrationInterface {
  name = 'AddStaffAccounts1792310400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."staff_accounts_role_enum" AS ENUM('ADMIN', 'STAFF')`)
    await queryRunner.query(
      `CREATE TABLE "staff_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(64) NOT NULL, "password_hash" character varying(255) NOT NULL, "full_name" character varying(120) NOT NULL DEFAULT '', "role" "public"."staff_accounts_role_enum" NOT NULL DEFAULT 'STAFF', "is_active" boolean NOT NULL DEFAULT true, "token_version" integer NOT NULL DEFAULT 0, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uq_staff_accounts_username" UNIQUE ("username"), CONSTRAINT "PK_staff_accounts_id" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "staff_accounts"`)
    await queryRunner.query(`DROP TYPE "public"."staff_accounts_role_enum"`)
  }
}
