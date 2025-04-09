import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (kept from original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Agent Status Enum
export const agentStatusEnum = pgEnum("agent_status", [
  "online",
  "offline",
  "busy",
  "idle"
]);

// Agent Role Enum
export const agentRoleEnum = pgEnum("agent_role", [
  "coordinator",
  "developer",
  "qa",
  "tester",
  "designer"
]);

// Agent schema
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("offline"),
  role: text("role").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  status: true,
  role: true,
  description: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Task Status Enum
export const taskStatusEnum = pgEnum("task_status", [
  "queued",
  "in_progress",
  "debugging",
  "verifying",
  "completed",
  "failed"
]);

// Task Priority Enum
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "critical"
]);

// Task schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  parentId: integer("parent_id").references(() => tasks.id), // Self-reference for parent-child relationship
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("queued"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: integer("assigned_to").references(() => agents.id),
  progress: integer("progress").default(0),
  estimatedTime: integer("estimated_time").default(0), // in minutes
  isFeature: boolean("is_feature").default(false), // Flag to identify if the task is a feature (can have subtasks)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  projectId: true,
  parentId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  assignedTo: true,
  estimatedTime: true,
  isFeature: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Log Type Enum
export const logTypeEnum = pgEnum("log_type", [
  "info",
  "warning",
  "error",
  "success",
  "conversation"  // Added for agent-to-agent conversations
]);

// Log schema
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id),
  projectId: integer("project_id").references(() => projects.id),
  targetAgentId: integer("target_agent_id").references(() => agents.id), // For conversations between agents
  type: text("type").notNull().default("info"),
  message: text("message").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertLogSchema = createInsertSchema(logs).pick({
  agentId: true,
  projectId: true,
  targetAgentId: true,
  type: true,
  message: true,
  details: true,
});

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

// Issue Type Enum
export const issueTypeEnum = pgEnum("issue_type", [
  "error",
  "warning",
  "info"
]);

// Issue schema
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  code: text("code"),
  solution: text("solution"),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIssueSchema = createInsertSchema(issues).pick({
  taskId: true,
  type: true,
  title: true,
  description: true,
  code: true,
  solution: true,
});

export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;

// Project Status Enum
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "in_progress",
  "review",
  "completed",
  "archived"
]);

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planning"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  status: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
