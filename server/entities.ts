import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm"

export enum WorkspaceRole {
  Owner = "owner",
  ProjectManager = "project_manager",
  TeamLeader = "team_leader",
  Member = "member",
  Tester = "tester",
}

export enum ProjectStatus {
  Planning = "planning",
  Active = "active",
  OnHold = "on_hold",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum TaskStatus {
  Backlog = "backlog",
  Todo = "todo",
  InProgress = "in_progress",
  InReview = "in_review",
  Done = "done",
  Blocked = "blocked",
  Cancelled = "cancelled",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string

  @Index({ unique: true })
  @Column({ type: "varchar", length: 190 })
  email: string

  @Column({ type: "varchar", length: 140 })
  name: string

  @Column({ type: "varchar", name: "password_hash", select: false })
  passwordHash: string

  @Column({ type: "varchar", length: 64, default: "UTC" })
  timezone: string

  @Column({ type: "varchar", length: 16, default: "en" })
  locale: string

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt: Date
}

@Entity("workspaces")
export class Workspace {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string

  @Column({ type: "varchar", length: 140 })
  name: string

  @Index({ unique: true })
  @Column({ type: "varchar", length: 100 })
  slug: string

  @Column({ type: "text", nullable: true })
  description: string | null

  @Column({ type: "boolean", name: "is_active", default: true })
  isActive: boolean

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "owner_user_id" })
  owner: User

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt: Date
}

@Entity("workspace_members")
@Unique(["workspace", "user"])
export class WorkspaceMember {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User

  @Column({ type: "enum", enum: WorkspaceRole, default: WorkspaceRole.Member })
  role: WorkspaceRole

  @Column({ type: "varchar", length: 24, default: "active" })
  status: string

  @CreateDateColumn({ type: "datetime", name: "joined_at" })
  joinedAt: Date
}

@Entity("workspace_invitations")
@Index(["tokenHash"], { unique: true })
export class WorkspaceInvitation {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "inviter_user_id" })
  inviter: User | null

  @Column({ type: "varchar", length: 190 })
  email: string

  @Column({ type: "enum", enum: WorkspaceRole })
  role: WorkspaceRole

  @Column({ type: "char", length: 64, name: "token_hash" })
  tokenHash: string

  @Column({ type: "datetime", name: "expires_at" })
  expiresAt: Date

  @Column({ type: "datetime", name: "accepted_at", nullable: true })
  acceptedAt: Date | null

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt: Date
}

@Entity("spaces")
@Unique(["workspace", "name"])
export class Space {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace

  @Column({ type: "varchar", length: 140 })
  name: string

  @Column({ type: "text", nullable: true })
  description: string | null

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt: Date
}

@Entity("projects")
@Unique(["workspace", "key"])
export class Project {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace

  @ManyToOne(() => Space, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "space_id" })
  space: Space

  @Column({ type: "varchar", length: 12 })
  key: string

  @Column({ type: "varchar", length: 180 })
  title: string

  @Column({ type: "text", nullable: true })
  description: string | null

  @Column({
    type: "enum",
    enum: ProjectStatus,
    default: ProjectStatus.Planning,
  })
  status: ProjectStatus

  @Column({ name: "start_date", type: "date", nullable: true })
  startDate: string | null

  @Column({ name: "target_date", type: "date", nullable: true })
  targetDate: string | null

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt: Date
}

@Entity("tasks")
@Unique(["workspace", "number"])
export class Task {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project: Project

  @Column({ type: "varchar", length: 24 })
  number: string

  @Column({ type: "varchar", length: 240 })
  title: string

  @Column({ type: "text", nullable: true })
  description: string | null

  @Column({ type: "enum", enum: TaskStatus, default: TaskStatus.Backlog })
  status: TaskStatus

  @Column({
    type: "enum",
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  })
  priority: "low" | "medium" | "high" | "critical"

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "owner_user_id" })
  owner: User

  @Column({ name: "start_date", type: "date", nullable: true })
  startDate: string | null

  @Column({ name: "due_date", type: "date", nullable: true })
  dueDate: string | null

  @Column({ name: "progress_pct", type: "tinyint", unsigned: true, default: 0 })
  progressPct: number

  @Column({ type: "boolean", name: "is_blocked", default: false })
  isBlocked: boolean

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt: Date
}
