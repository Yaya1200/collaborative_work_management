import type { MigrationInterface, QueryRunner } from "typeorm"

export class InitialWorkspaceSchema1729958400000 implements MigrationInterface {
  name = "InitialWorkspaceSchema1729958400000"

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id BIGINT NOT NULL AUTO_INCREMENT,
        email VARCHAR(190) NOT NULL,
        name VARCHAR(140) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
        locale VARCHAR(16) NOT NULL DEFAULT 'en',
        isActive TINYINT NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_users_email (email),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `)
    await queryRunner.query(`
      CREATE TABLE workspaces (
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(140) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        description TEXT NULL,
        owner_user_id BIGINT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_workspaces_slug (slug),
        PRIMARY KEY (id),
        CONSTRAINT FK_workspaces_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
      ) ENGINE=InnoDB
    `)
    await queryRunner.query(`
      CREATE TABLE workspace_members (
        id BIGINT NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        role ENUM('owner','admin','member','viewer') NOT NULL DEFAULT 'member',
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        joined_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX UQ_workspace_member (workspace_id, user_id),
        PRIMARY KEY (id),
        CONSTRAINT FK_members_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT FK_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)
    await queryRunner.query(`
      CREATE TABLE spaces (
        id BIGINT NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT NOT NULL,
        name VARCHAR(140) NOT NULL,
        description TEXT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX UQ_space_name (workspace_id, name),
        PRIMARY KEY (id),
        CONSTRAINT FK_spaces_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)
    await queryRunner.query(`
      CREATE TABLE projects (
        id BIGINT NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT NOT NULL,
        space_id BIGINT NOT NULL,
        \`key\` VARCHAR(12) NOT NULL,
        title VARCHAR(180) NOT NULL,
        description TEXT NULL,
        status ENUM('planning','active','on_hold','completed','cancelled') NOT NULL DEFAULT 'planning',
        start_date DATE NULL,
        target_date DATE NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX UQ_project_key (workspace_id, \`key\`),
        INDEX IDX_projects_workspace_status (workspace_id, status),
        PRIMARY KEY (id),
        CONSTRAINT FK_projects_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT FK_projects_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB
    `)
    await queryRunner.query(`
      CREATE TABLE tasks (
        id BIGINT NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT NOT NULL,
        project_id BIGINT NOT NULL,
        number VARCHAR(24) NOT NULL,
        title VARCHAR(240) NOT NULL,
        description TEXT NULL,
        status ENUM('backlog','todo','in_progress','in_review','done','blocked') NOT NULL DEFAULT 'backlog',
        priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
        owner_user_id BIGINT NOT NULL,
        start_date DATE NULL,
        due_date DATE NULL,
        progress_pct TINYINT UNSIGNED NOT NULL DEFAULT 0,
        is_blocked TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX UQ_task_number (workspace_id, number),
        INDEX IDX_tasks_workspace_status_due (workspace_id, status, due_date),
        INDEX IDX_tasks_owner_status (owner_user_id, status),
        PRIMARY KEY (id),
        CONSTRAINT FK_tasks_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT FK_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT FK_tasks_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT CHK_tasks_progress CHECK (progress_pct BETWEEN 0 AND 100),
        CONSTRAINT CHK_tasks_dates CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
      ) ENGINE=InnoDB
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE tasks")
    await queryRunner.query("DROP TABLE projects")
    await queryRunner.query("DROP TABLE spaces")
    await queryRunner.query("DROP TABLE workspace_members")
    await queryRunner.query("DROP TABLE workspaces")
    await queryRunner.query("DROP TABLE users")
  }
}
