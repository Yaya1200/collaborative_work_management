import type { MigrationInterface, QueryRunner } from "typeorm"

export class AddRoleBasedInvitations1730793600000
  implements MigrationInterface
{
  name = "AddRoleBasedInvitations1730793600000"

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workspace_members
      MODIFY role ENUM(
        'owner','admin','developer','member','viewer',
        'project_manager','team_leader','tester'
      ) NOT NULL DEFAULT 'member'
    `)

    await queryRunner.query(`
      UPDATE workspace_members
      SET role = CASE role
        WHEN 'admin' THEN 'project_manager'
        WHEN 'developer' THEN 'member'
        WHEN 'viewer' THEN 'tester'
        ELSE role
      END
    `)

    await queryRunner.query(`
      ALTER TABLE workspace_members
      MODIFY role ENUM('owner','project_manager','team_leader','member','tester')
      NOT NULL DEFAULT 'member'
    `)

    await queryRunner.query(`
      UPDATE workspace_members AS membership
      INNER JOIN workspaces AS workspace
        ON workspace.id = membership.workspace_id
        AND workspace.owner_user_id = membership.user_id
      SET membership.role = 'owner'
    `)

    await queryRunner.query(`
      CREATE TABLE workspace_invitations (
        id BIGINT NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT NOT NULL,
        inviter_user_id BIGINT NULL,
        email VARCHAR(190) NOT NULL,
        role ENUM('owner','project_manager','team_leader','member','tester') NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME(6) NOT NULL,
        accepted_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_workspace_invitations_token_hash (token_hash),
        INDEX IDX_workspace_invitations_email (workspace_id, email),
        PRIMARY KEY (id),
        CONSTRAINT FK_invitations_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT FK_invitations_inviter FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE workspace_invitations")

    await queryRunner.query(`
      ALTER TABLE workspace_members
      MODIFY role ENUM(
        'owner','admin','developer','member','viewer',
        'project_manager','team_leader','tester'
      ) NOT NULL DEFAULT 'member'
    `)

    await queryRunner.query(`
      UPDATE workspace_members
      SET role = CASE role
        WHEN 'project_manager' THEN 'admin'
        WHEN 'team_leader' THEN 'member'
        WHEN 'tester' THEN 'viewer'
        ELSE role
      END
    `)

    await queryRunner.query(`
      ALTER TABLE workspace_members
      MODIFY role ENUM('owner','admin','developer','member','viewer')
      NOT NULL DEFAULT 'member'
    `)
  }
}
