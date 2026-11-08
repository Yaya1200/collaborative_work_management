import type { MigrationInterface, QueryRunner } from "typeorm"

export class AddWorkspaceCancellation1730880000000
  implements MigrationInterface
{
  name = "AddWorkspaceCancellation1730880000000"

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workspaces
      ADD is_active TINYINT NOT NULL DEFAULT 1
    `)
    await queryRunner.query(`
      ALTER TABLE tasks
      MODIFY status ENUM(
        'backlog','todo','in_progress','in_review','done','blocked','cancelled'
      ) NOT NULL DEFAULT 'backlog'
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE tasks SET status = 'todo' WHERE status = 'cancelled'
    `)
    await queryRunner.query(`
      ALTER TABLE tasks
      MODIFY status ENUM('backlog','todo','in_progress','in_review','done','blocked')
      NOT NULL DEFAULT 'backlog'
    `)
    await queryRunner.query(`
      ALTER TABLE workspaces DROP COLUMN is_active
    `)
  }
}
