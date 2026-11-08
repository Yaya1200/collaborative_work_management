import type { MigrationInterface, QueryRunner } from "typeorm"

export class AddDeveloperRole1730707200000 implements MigrationInterface {
  name = "AddDeveloperRole1730707200000"

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workspace_members
      MODIFY role ENUM('owner','admin','developer','member','viewer') NOT NULL DEFAULT 'member'
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workspace_members SET role = 'member' WHERE role = 'developer'
    `)

    await queryRunner.query(`
      ALTER TABLE workspace_members
      MODIFY role ENUM('owner','admin','member','viewer') NOT NULL DEFAULT 'member'
    `)
  }
}
