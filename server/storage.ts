import { 
  Agent, 
  InsertAgent, 
  Task, 
  InsertTask, 
  Log, 
  InsertLog, 
  Issue, 
  InsertIssue,
  User,
  InsertUser,
  Project,
  InsertProject,
  users,
  agents,
  tasks,
  logs,
  issues,
  projects
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, sql, desc, asc, isNull, gt, count, ilike } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined>;
  
  // Agent methods
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgentStatus(id: number, status: string): Promise<Agent | undefined>;
  
  // Task methods
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByStatus(status: string): Promise<Task[]>;
  getTasksByAgent(agentId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  updateTaskStatus(id: number, status: string, progress?: number): Promise<Task | undefined>;
  updateTaskProgress(id: number, progress: number): Promise<Task | undefined>;
  
  // Feature and Subtask methods
  getFeatures(projectId?: number): Promise<Task[]>;
  getSubtasks(parentId: number): Promise<Task[]>;
  createFeature(task: InsertTask): Promise<Task>;
  createSubtask(task: InsertTask): Promise<Task>;
  
  // Log methods
  getLogs(): Promise<Log[]>;
  getLogsByAgent(agentId: number): Promise<Log[]>;
  getLogsByProject(projectId: number): Promise<Log[]>;
  getConversationLogs(projectId?: number): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  clearConversationLogs(projectId: number): Promise<boolean>;
  
  // Issue methods
  getIssues(): Promise<Issue[]>;
  getIssuesByTask(taskId: number): Promise<Issue[]>;
  getUnresolvedIssues(): Promise<Issue[]>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  resolveIssue(id: number): Promise<Issue | undefined>;
  
  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProjectStatus(id: number, status: string): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    activeAgents: number;
    totalAgents: number;
    tasksInQueue: number;
    completedTasks: number;
    issuesDetected: number;
    criticalIssues: number;
    warningIssues: number;
    verificationRate: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private agents: Map<number, Agent>;
  private tasks: Map<number, Task>;
  private logs: Map<number, Log>;
  private issues: Map<number, Issue>;
  private projects: Map<number, Project>;
  
  currentUserId: number;
  currentAgentId: number;
  currentTaskId: number;
  currentLogId: number;
  currentIssueId: number;
  currentProjectId: number;

  constructor() {
    this.users = new Map();
    this.agents = new Map();
    this.tasks = new Map();
    this.logs = new Map();
    this.issues = new Map();
    this.projects = new Map();
    
    this.currentUserId = 1;
    this.currentAgentId = 1;
    this.currentTaskId = 1;
    this.currentLogId = 1;
    this.currentIssueId = 1;
    this.currentProjectId = 1;
    
    // Initialize with default agents only
    this.initializeDefaultAgents();
  }
  
  private initializeSampleProjects() {
    const sampleProjects = [
      {
        name: "E-commerce Platform",
        description: "A complete e-commerce solution with product catalog, shopping cart, and checkout",
        status: "in_progress"
      },
      {
        name: "Task Management System",
        description: "A project management tool with task tracking and team collaboration features",
        status: "planning"
      },
      {
        name: "Personal Finance App",
        description: "Application for tracking expenses, budgeting, and financial goal planning",
        status: "review"
      }
    ];
    
    sampleProjects.forEach(project => {
      this.createProject(project);
    });
  }

  private initializeDefaultAgents() {
    const defaultAgents = [
      { name: "Orchestrator", status: "online", role: "coordinator", description: "Coordinates tasks between agents" },
      { name: "Builder", status: "online", role: "developer", description: "Builds application components" },
      { name: "Debugger", status: "online", role: "qa", description: "Finds and fixes bugs" },
      { name: "Verifier", status: "offline", role: "tester", description: "Verifies component functionality" }
    ];
    
    defaultAgents.forEach(agent => {
      this.createAgent(agent);
    });
  }

  private initializeSampleTasks() {
    const sampleTasks = [
      { 
        title: "Build User Authentication Component", 
        description: "Create login, registration and password reset components", 
        status: "in_progress", 
        priority: "high", 
        assignedTo: 2, // Builder 
        progress: 65, 
        estimatedTime: 30
      },
      { 
        title: "Fix API Integration Issues", 
        description: "Fix issues with third-party API integration", 
        status: "debugging", 
        priority: "medium", 
        assignedTo: 3, // Debugger 
        progress: 40, 
        estimatedTime: 45
      },
      { 
        title: "Verify Form Validation Logic", 
        description: "Ensure all form validations work correctly", 
        status: "queued", 
        priority: "low", 
        assignedTo: 4, // Verifier 
        progress: 0, 
        estimatedTime: 60
      }
    ];
    
    sampleTasks.forEach(task => {
      this.createTask(task);
    });
  }

  private initializeSampleLogs() {
    const now = new Date();
    const sampleLogs = [
      { 
        agentId: 2, 
        type: "info", 
        message: "Builder agent initialized. Ready to process tasks.", 
        timestamp: new Date(now.getTime() - 600000)
      },
      { 
        agentId: 1, 
        type: "info", 
        message: "Assigning task: Build User Authentication Component", 
        timestamp: new Date(now.getTime() - 550000)
      },
      { 
        agentId: 2, 
        type: "info", 
        message: "Task received. Beginning component architecture planning.", 
        timestamp: new Date(now.getTime() - 540000)
      },
      { 
        agentId: 2, 
        type: "info", 
        message: "Creating component structure", 
        details: "└── AuthComponent/\n    ├── LoginForm.jsx\n    ├── RegisterForm.jsx\n    ├── PasswordReset.jsx\n    ├── AuthContext.js\n    └── useAuth.js", 
        timestamp: new Date(now.getTime() - 500000)
      },
      { 
        agentId: 2, 
        type: "info", 
        message: "Implementing LoginForm component", 
        details: "import React, { useState } from 'react';\nimport { useAuth } from './useAuth';\n\nconst LoginForm = () => {\n  const [email, setEmail] = useState('');\n  const [password, setPassword] = useState('');\n  const { login, error } = useAuth();\n\n  const handleSubmit = async (e) => {\n    e.preventDefault();\n    await login(email, password);\n  }\n\n  return (\n    <form onSubmit={handleSubmit}>\n      {/* Form implementation */}\n    </form>\n  );\n}", 
        timestamp: new Date(now.getTime() - 450000)
      },
      { 
        agentId: 2, 
        type: "info", 
        message: "Working on authentication context...", 
        timestamp: new Date(now.getTime() - 400000)
      },
      { 
        agentId: 2, 
        type: "info", 
        message: "Implementing form validation logic", 
        timestamp: new Date(now.getTime() - 300000)
      }
    ];
    
    sampleLogs.forEach(log => {
      this.createLog(log);
    });
  }

  private initializeSampleIssues() {
    const sampleIssues = [
      { 
        taskId: 1, 
        type: "error", 
        title: "Undefined variable 'isAuthenticated'", 
        description: "Undefined variable 'isAuthenticated' when checking authentication state", 
        code: "useEffect(() => {\n  if (isAuthenticated) {  // <-- Error here\n    navigate('/dashboard');\n  }\n}, [user]);", 
        solution: "useEffect(() => {\n  if (user !== null) {\n    navigate('/dashboard');\n  }\n}, [user]);", 
        resolved: false
      },
      { 
        taskId: 1, 
        type: "warning", 
        title: "Missing dependencies in useEffect", 
        description: "React Hook useEffect has missing dependencies: 'token' and 'user'", 
        code: "useEffect(() => {\n  // Some logic using token and user\n}, []);", 
        solution: "Consider adding these variables to the dependency array to ensure proper reactivity.", 
        resolved: false
      },
      { 
        taskId: 1, 
        type: "warning", 
        title: "Form submission error handling", 
        description: "Form submission doesn't handle potential network failures", 
        code: "const handleSubmit = async (e) => {\n  e.preventDefault();\n  await login(email, password);\n}", 
        solution: "Add try/catch block and implement error handling for network issues.", 
        resolved: false
      }
    ];
    
    sampleIssues.forEach(issue => {
      this.createIssue(issue);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt,
      role: 'user',
      githubUsername: null,
      githubToken: null,
      lastLogin: null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, lastLogin: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, password: hashedPassword };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = this.currentAgentId++;
    const createdAt = new Date();
    // Ensure required fields are set with defaults if not provided
    const agent: Agent = { 
      ...insertAgent, 
      id, 
      createdAt,
      status: insertAgent.status || 'idle',
      role: insertAgent.role || 'assistant',
      description: insertAgent.description || null
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgentStatus(id: number, status: string): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    const updatedAgent = { ...agent, status };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  async getTasksByAgent(agentId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.assignedTo === agentId);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const progress = 0;
    const task: Task = { 
      ...insertTask, 
      id, 
      progress, 
      createdAt, 
      updatedAt,
      projectId: insertTask.projectId || null,
      status: insertTask.status || "queued",
      priority: insertTask.priority || "medium",
      description: insertTask.description || null,
      assignedTo: insertTask.assignedTo || null,
      estimatedTime: insertTask.estimatedTime || null
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTaskStatus(id: number, status: string, progress?: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedAt = new Date();
    const updatedTask = { 
      ...task, 
      status, 
      updatedAt,
      progress: progress !== undefined ? progress : task.progress
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedAt = new Date();
    const updatedTask = { 
      ...task, 
      ...updates,
      updatedAt 
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async updateTaskProgress(id: number, progress: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedAt = new Date();
    const updatedTask = { ...task, progress, updatedAt };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Log methods
  async getLogs(): Promise<Log[]> {
    return Array.from(this.logs.values());
  }

  async getLogsByAgent(agentId: number): Promise<Log[]> {
    return Array.from(this.logs.values())
      .filter(log => log.agentId === agentId)
      .sort((a, b) => {
        // Safely handle null timestamps by defaulting to current time
        const timeA = a.timestamp ? a.timestamp.getTime() : Date.now();
        const timeB = b.timestamp ? b.timestamp.getTime() : Date.now();
        return timeB - timeA;
      });
  }

  async getLogsByProject(projectId: number): Promise<Log[]> {
    return Array.from(this.logs.values())
      .filter(log => log.projectId === projectId)
      .sort((a, b) => {
        // Safely handle null timestamps by defaulting to current time
        const timeA = a.timestamp ? a.timestamp.getTime() : Date.now();
        const timeB = b.timestamp ? b.timestamp.getTime() : Date.now();
        return timeB - timeA;
      });
  }

  async getConversationLogs(projectId?: number): Promise<Log[]> {
    let logs = Array.from(this.logs.values())
      .filter(log => log.type === 'conversation');
    
    // If projectId is provided, filter by project
    if (projectId !== undefined) {
      logs = logs.filter(log => log.projectId === projectId);
    }
    
    return logs.sort((a, b) => {
      const timeA = a.timestamp ? a.timestamp.getTime() : Date.now();
      const timeB = b.timestamp ? b.timestamp.getTime() : Date.now();
      return timeB - timeA;
    });
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const id = this.currentLogId++;
    const timestamp = new Date();
    const log: Log = { 
      ...insertLog, 
      id, 
      timestamp,
      type: insertLog.type || 'info',
      agentId: insertLog.agentId || null,
      projectId: insertLog.projectId || null,
      targetAgentId: insertLog.targetAgentId || null,
      details: insertLog.details || null
    };
    this.logs.set(id, log);
    return log;
  }
  
  async clearConversationLogs(projectId: number): Promise<boolean> {
    // Get all log IDs for conversation logs in this project
    const logIdsToRemove = Array.from(this.logs.values())
      .filter(log => log.projectId === projectId && log.type === 'conversation')
      .map(log => log.id);
    
    // Remove all identified logs
    for (const logId of logIdsToRemove) {
      this.logs.delete(logId);
    }
    
    return true;
  }

  // Issue methods
  async getIssues(): Promise<Issue[]> {
    return Array.from(this.issues.values());
  }

  async getIssuesByTask(taskId: number): Promise<Issue[]> {
    return Array.from(this.issues.values()).filter(issue => issue.taskId === taskId);
  }

  async getUnresolvedIssues(): Promise<Issue[]> {
    return Array.from(this.issues.values()).filter(issue => !issue.resolved);
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const id = this.currentIssueId++;
    const createdAt = new Date();
    
    // Explicitly create the issue with all required fields
    const issue: Issue = { 
      id, 
      title: insertIssue.title,
      description: insertIssue.description,
      type: insertIssue.type || 'warning',
      taskId: insertIssue.taskId || null,
      code: insertIssue.code || null,
      solution: insertIssue.solution || null,
      resolved: false, 
      createdAt
    };
    
    this.issues.set(id, issue);
    return issue;
  }

  async resolveIssue(id: number): Promise<Issue | undefined> {
    const issue = this.issues.get(id);
    if (!issue) return undefined;
    
    const updatedIssue = { ...issue, resolved: true };
    this.issues.set(id, updatedIssue);
    return updatedIssue;
  }
  
  // Project methods
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    // Create project object explicitly listing all required fields
    const project: Project = { 
      id, 
      name: insertProject.name,
      status: insertProject.status || 'planning',
      description: insertProject.description || null,
      userId: insertProject.userId || null,
      githubRepo: insertProject.githubRepo || null,
      githubBranch: insertProject.githubBranch || null,
      lastCommitSha: null,
      createdAt, 
      updatedAt,
      completedAt: null
    };
    
    this.projects.set(id, project);
    return project;
  }
  
  async updateProjectStatus(id: number, status: string): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedAt = new Date();
    let completedAt = project.completedAt;
    
    // If status changed to completed, set the completedAt timestamp
    if (status === "completed" && project.status !== "completed") {
      completedAt = new Date();
    } 
    // If status changed from completed to something else, clear the completedAt timestamp
    else if (status !== "completed" && project.status === "completed") {
      completedAt = null;
    }
    
    const updatedProject = { 
      ...project, 
      status, 
      updatedAt,
      completedAt
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async getTasksByProject(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.projectId === projectId);
  }
  
  async getFeatures(projectId?: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.isFeature && (projectId ? task.projectId === projectId : true));
  }

  async getSubtasks(parentId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.parentId === parentId);
  }

  async createFeature(task: InsertTask): Promise<Task> {
    const featureTask = { ...task, isFeature: true };
    return this.createTask(featureTask);
  }

  async createSubtask(task: InsertTask): Promise<Task> {
    // Validate that parent task exists
    if (task.parentId && !this.tasks.has(task.parentId)) {
      throw new Error(`Parent task ${task.parentId} does not exist`);
    }
    return this.createTask(task);
  }
  
  async deleteProject(id: number): Promise<boolean> {
    const project = this.projects.get(id);
    if (!project) return false;
    
    // Delete associated logs (convert entries to array first for TypeScript compatibility)
    Array.from(this.logs.entries()).forEach(([logId, log]) => {
      if (log.projectId === id) {
        this.logs.delete(logId);
      }
    });
    
    // Get task IDs for this project
    const projectTasks = Array.from(this.tasks.values())
      .filter(task => task.projectId === id);
    const taskIds = projectTasks.map(task => task.id);
    
    // Delete issues related to these tasks (convert entries to array first)
    Array.from(this.issues.entries()).forEach(([issueId, issue]) => {
      if (issue.taskId !== null && taskIds.includes(issue.taskId)) {
        this.issues.delete(issueId);
      }
    });
    
    // Delete the tasks
    taskIds.forEach(taskId => {
      this.tasks.delete(taskId);
    });
    
    // Delete the project
    this.projects.delete(id);
    
    return true;
  }

  // Dashboard metrics
  async getDashboardMetrics(): Promise<{
    activeAgents: number;
    totalAgents: number;
    tasksInQueue: number;
    completedTasks: number;
    issuesDetected: number;
    criticalIssues: number;
    warningIssues: number;
    verificationRate: number;
  }> {
    const agents = await this.getAgents();
    const tasks = await this.getTasks();
    const issues = await this.getIssues();
    
    const activeAgents = agents.filter(agent => agent.status === "online").length;
    const totalAgents = agents.length;
    
    const tasksInQueue = tasks.filter(task => 
      ["queued", "in_progress", "debugging", "verifying"].includes(task.status)
    ).length;
    
    const completedTasks = tasks.filter(task => task.status === "completed").length;
    
    const issuesDetected = issues.length;
    const criticalIssues = issues.filter(issue => issue.type === "error" && !issue.resolved).length;
    const warningIssues = issues.filter(issue => issue.type === "warning" && !issue.resolved).length;
    
    // Calculate verification rate (% of tasks that pass verification)
    const verifiedTasks = completedTasks > 0 ? completedTasks : 1;
    const failedTasks = tasks.filter(task => task.status === "failed").length;
    const verificationRate = Math.round((verifiedTasks / (verifiedTasks + failedTasks)) * 100);
    
    return {
      activeAgents,
      totalAgents,
      tasksInQueue,
      completedTasks,
      issuesDetected,
      criticalIssues,
      warningIssues,
      verificationRate
    };
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Use case-insensitive comparison with ilike
    const [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user || undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log("Creating user in DatabaseStorage:", insertUser);
      const now = new Date();
      
      // Make sure email and fullName are properly set to null if undefined
      const userData = {
        username: insertUser.username,
        password: insertUser.password,
        email: insertUser.email || null,
        fullName: insertUser.fullName || null,
        createdAt: now,
        role: 'user',
        githubUsername: null,
        githubToken: null,
        lastLogin: null
      };
      
      console.log("Processed user data:", {
        ...userData,
        password: "***REDACTED***"
      });
      
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      
      console.log("User created successfully:", user.id);
      return user;
    } catch (error) {
      console.error("Error creating user in DatabaseStorage:", error);
      throw error;
    }
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }
  
  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }
  
  async updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }
  
  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return db.select().from(agents);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db
      .insert(agents)
      .values({
        name: insertAgent.name,
        role: insertAgent.role,
        status: insertAgent.status || 'offline',
        description: insertAgent.description || null,
        createdAt: new Date()
      })
      .returning();
    return agent;
  }

  async updateAgentStatus(id: number, status: string): Promise<Agent | undefined> {
    const [agent] = await db
      .update(agents)
      .set({ status })
      .where(eq(agents.id, id))
      .returning();
    return agent || undefined;
  }
  
  // Task methods
  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.status, status));
  }

  async getTasksByAgent(agentId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.assignedTo, agentId));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const now = new Date();
    const [task] = await db
      .insert(tasks)
      .values({
        title: insertTask.title,
        description: insertTask.description || null,
        status: insertTask.status || 'queued',
        priority: insertTask.priority || 'medium',
        assignedTo: insertTask.assignedTo || null,
        estimatedTime: insertTask.estimatedTime || null,
        projectId: insertTask.projectId || null,
        progress: 0,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return task;
  }

  async updateTaskStatus(id: number, status: string, progress?: number): Promise<Task | undefined> {
    const updateData: any = { 
      status,
      updatedAt: new Date()
    };
    
    if (progress !== undefined) {
      updateData.progress = progress;
    }
    
    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }
  
  async updateTaskProgress(id: number, progress: number): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ 
        progress,
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }
  
  // Feature and Subtask methods
  async getFeatures(projectId?: number): Promise<Task[]> {
    try {
      let conditions = [];
      conditions.push(eq(tasks.isFeature, true));
      
      if (projectId !== undefined) {
        conditions.push(eq(tasks.projectId, projectId));
      }
      
      const result = await db
        .select()
        .from(tasks)
        .where(and(...conditions));
        
      return result;
    } catch (error) {
      console.error('Error getting features:', error);
      return [];
    }
  }
  
  async getSubtasks(parentId: number): Promise<Task[]> {
    try {
      return await db
        .select()
        .from(tasks)
        .where(eq(tasks.parentId, parentId));
    } catch (error) {
      console.error('Error getting subtasks:', error);
      return [];
    }
  }
  
  async createFeature(task: InsertTask): Promise<Task> {
    try {
      // Ensure it's marked as a feature
      const featureTask = {
        ...task,
        isFeature: true
      };
      
      const [feature] = await db
        .insert(tasks)
        .values(featureTask)
        .returning();
      
      return feature;
    } catch (error) {
      console.error('Error creating feature:', error);
      throw error;
    }
  }
  
  async createSubtask(task: InsertTask): Promise<Task> {
    try {
      // Verify parent task exists and is a feature
      if (!task.parentId) {
        throw new Error('Parent ID is required for a subtask');
      }
      
      const [parentTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.parentId));
      
      if (!parentTask) {
        throw new Error(`Parent task with ID ${task.parentId} not found`);
      }
      
      if (!parentTask.isFeature) {
        throw new Error(`Parent task with ID ${task.parentId} is not a feature and cannot have subtasks`);
      }
      
      const [subtask] = await db
        .insert(tasks)
        .values(task)
        .returning();
      
      return subtask;
    } catch (error) {
      console.error('Error creating subtask:', error);
      throw error;
    }
  }
  
  // Log methods
  async getLogs(): Promise<Log[]> {
    return db.select().from(logs);
  }

  async getLogsByAgent(agentId: number): Promise<Log[]> {
    return db.select()
      .from(logs)
      .where(eq(logs.agentId, agentId))
      .orderBy((logs) => desc(logs.timestamp));
  }
  
  async getLogsByProject(projectId: number): Promise<Log[]> {
    return db.select()
      .from(logs)
      .where(eq(logs.projectId, projectId))
      .orderBy((logs) => desc(logs.timestamp));
  }
  
  async getConversationLogs(projectId?: number): Promise<Log[]> {
    if (projectId !== undefined) {
      // If projectId is provided, filter by both type and projectId
      return db.select()
        .from(logs)
        .where(and(
          eq(logs.type, 'conversation'),
          eq(logs.projectId, projectId)
        ))
        .orderBy(desc(logs.timestamp));
    } else {
      // Otherwise just filter by type
      return db.select()
        .from(logs)
        .where(eq(logs.type, 'conversation'))
        .orderBy(desc(logs.timestamp));
    }
  }

  async clearConversationLogs(projectId: number): Promise<boolean> {
    try {
      await db
        .delete(logs)
        .where(and(
          eq(logs.projectId, projectId),
          eq(logs.type, 'conversation')
        ));
      return true;
    } catch (error) {
      console.error('Error clearing conversation logs:', error);
      return false;
    }
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const now = new Date();
    const [log] = await db
      .insert(logs)
      .values({
        message: insertLog.message,
        type: insertLog.type || 'info',
        agentId: insertLog.agentId || null,
        projectId: insertLog.projectId || null,
        targetAgentId: insertLog.targetAgentId || null,
        details: insertLog.details || null,
        timestamp: now
      })
      .returning();
    return log;
  }
  
  // Issue methods
  async getIssues(): Promise<Issue[]> {
    return db.select().from(issues);
  }

  async getIssuesByTask(taskId: number): Promise<Issue[]> {
    return db.select().from(issues).where(eq(issues.taskId, taskId));
  }

  async getUnresolvedIssues(): Promise<Issue[]> {
    return db.select().from(issues).where(eq(issues.resolved, false));
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const [issue] = await db
      .insert(issues)
      .values({
        title: insertIssue.title,
        description: insertIssue.description,
        type: insertIssue.type || 'warning',
        taskId: insertIssue.taskId || null,
        code: insertIssue.code || null,
        solution: insertIssue.solution || null,
        resolved: false,
        createdAt: new Date()
      })
      .returning();
    return issue;
  }

  async resolveIssue(id: number): Promise<Issue | undefined> {
    const [issue] = await db
      .update(issues)
      .set({ resolved: true })
      .where(eq(issues.id, id))
      .returning();
    return issue || undefined;
  }
  
  // Project methods
  async getProjects(): Promise<Project[]> {
    try {
      console.log("Fetching projects from database");
      const result = await db.select().from(projects);
      console.log(`Successfully fetched ${result.length} projects`);
      return result;
    } catch (err) {
      console.error("Error in getProjects:", err);
      throw err;
    }
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    try {
      console.log(`Fetching project with id ${id}`);
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      console.log("Project fetch result:", project || "Not found");
      return project || undefined;
    } catch (err) {
      console.error(`Error in getProject(${id}):`, err);
      throw err;
    }
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    try {
      console.log("Creating new project:", insertProject);
      const now = new Date();
      const projectData = {
        name: insertProject.name,
        description: insertProject.description || null,
        status: insertProject.status || 'planning',
        userId: insertProject.userId || null,
        githubRepo: insertProject.githubRepo || null,
        githubBranch: insertProject.githubBranch || null,
        lastCommitSha: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null
      };
      console.log("Project data to insert:", projectData);
      
      const [project] = await db
        .insert(projects)
        .values(projectData)
        .returning();
      
      console.log("Project created successfully:", project);
      return project;
    } catch (err) {
      console.error("Error in createProject:", err);
      throw err;
    }
  }
  
  async updateProjectStatus(id: number, status: string): Promise<Project | undefined> {
    try {
      console.log(`Updating project ${id} status to ${status}`);
      const project = await this.getProject(id);
      if (!project) {
        console.log(`Project ${id} not found for status update`);
        return undefined;
      }
      
      const updateData: any = { 
        status,
        updatedAt: new Date()
      };
      
      // If status changed to completed, set the completedAt timestamp
      if (status === "completed" && project.status !== "completed") {
        updateData.completedAt = new Date();
      } 
      // If status changed from completed to something else, clear the completedAt timestamp
      else if (status !== "completed" && project.status === "completed") {
        updateData.completedAt = null;
      }
      
      console.log(`Updating project with data:`, updateData);
      const [updatedProject] = await db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, id))
        .returning();
      
      console.log(`Project update result:`, updatedProject || "No result");
      return updatedProject || undefined;
    } catch (err) {
      console.error(`Error in updateProjectStatus(${id}, ${status}):`, err);
      throw err;
    }
  }
  
  async getTasksByProject(projectId: number): Promise<Task[]> {
    try {
      console.log(`Getting tasks for project ${projectId}`);
      const result = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
      console.log(`Found ${result.length} tasks for project ${projectId}`);
      return result;
    } catch (err) {
      console.error(`Error in getTasksByProject(${projectId}):`, err);
      throw err;
    }
  }
  
  // Dashboard metrics
  async getDashboardMetrics(): Promise<{
    activeAgents: number;
    totalAgents: number;
    tasksInQueue: number;
    completedTasks: number;
    issuesDetected: number;
    criticalIssues: number;
    warningIssues: number;
    verificationRate: number;
  }> {
    // Get all agents
    const allAgents = await this.getAgents();
    const activeAgents = allAgents.filter(agent => agent.status === "online").length;
    const totalAgents = allAgents.length;
    
    // Get all tasks
    const allTasks = await this.getTasks();
    const tasksInQueue = allTasks.filter(task => 
      ["queued", "in_progress", "debugging", "verifying"].includes(task.status)
    ).length;
    const completedTasks = allTasks.filter(task => task.status === "completed").length;
    const failedTasks = allTasks.filter(task => task.status === "failed").length;
    
    // Get all issues
    const allIssues = await this.getIssues();
    const issuesDetected = allIssues.length;
    const criticalIssues = allIssues.filter(issue => issue.type === "error" && !issue.resolved).length;
    const warningIssues = allIssues.filter(issue => issue.type === "warning" && !issue.resolved).length;
    
    // Calculate verification rate
    const verifiedTasks = completedTasks > 0 ? completedTasks : 1;
    const verificationRate = Math.round((verifiedTasks / (verifiedTasks + failedTasks)) * 100);
    
    return {
      activeAgents,
      totalAgents,
      tasksInQueue,
      completedTasks,
      issuesDetected,
      criticalIssues,
      warningIssues,
      verificationRate
    };
  }
  
  async deleteProject(id: number): Promise<boolean> {
    try {
      console.log(`Deleting project ${id} and all related data`);
      
      // First, delete all related data in the correct order to respect foreign key constraints
      
      // 1. Delete associated logs
      try {
        const deleteLogsResult = await db.delete(logs)
          .where(eq(logs.projectId, id))
          .execute();
        console.log(`Deleted logs for project ${id}. Result:`, deleteLogsResult);
      } catch (error) {
        console.error(`Error deleting logs for project ${id}:`, error);
        // Continue with deletion process even if logs deletion fails
      }
      
      // 2. Get all tasks for this project to find their IDs
      const projectTasks = await this.getTasksByProject(id);
      const taskIds = projectTasks.map(task => task.id);
      
      // 3. Delete issues related to this project's tasks
      if (taskIds.length > 0) {
        try {
          for (const taskId of taskIds) {
            await db.delete(issues)
              .where(eq(issues.taskId, taskId))
              .execute();
          }
          console.log(`Deleted issues for ${taskIds.length} tasks in project ${id}`);
        } catch (error) {
          console.error(`Error deleting issues for project ${id} tasks:`, error);
          // Continue with deletion process even if this fails
        }
      }
      
      // 4. Delete tasks related to this project
      try {
        const deleteTasksResult = await db.delete(tasks)
          .where(eq(tasks.projectId, id))
          .execute();
        console.log(`Deleted tasks for project ${id}. Result:`, deleteTasksResult);
      } catch (error) {
        console.error(`Error deleting tasks for project ${id}:`, error);
        // Continue with deletion process even if tasks deletion fails
      }
      
      // 5. Finally, delete the project itself
      try {
        console.log(`Attempting to delete project with id: ${id}`);
        
        const result = await db.delete(projects)
          .where(eq(projects.id, id))
          .returning()
          .execute();
        
        console.log(`Project deletion query result:`, result);
        
        if (result.length === 0) {
          console.log(`No project deleted with id: ${id}`);
          return false;
        }
        
        console.log(`Successfully deleted project ${id} and all related data`);
        return true;
      } catch (error) {
        console.error(`Error in final step of deleting project ${id}:`, error);
        throw error; // Re-throw this error since it's critical
      }
    } catch (err) {
      console.error(`Error in deleteProject(${id}):`, err);
      throw err;
    }
  }

  // Helper method to initialize database with only agents
  async seedDatabase() {
    // Check if we already have agents
    const existingAgents = await this.getAgents();
    
    if (existingAgents.length === 0) {
      // Initialize with default agents only
      const defaultAgents = [
        { name: "Orchestrator", status: "online", role: "coordinator", description: "Coordinates tasks between agents" },
        { name: "Builder", status: "online", role: "developer", description: "Builds application components" },
        { name: "Debugger", status: "online", role: "qa", description: "Finds and fixes bugs" },
        { name: "Verifier", status: "online", role: "tester", description: "Verifies component functionality" },
        { name: "UX Designer", status: "online", role: "designer", description: "Designs user interfaces and experiences" }
      ];
      
      for (const agent of defaultAgents) {
        await this.createAgent(agent);
      }
    }
  }
}

// Use DatabaseStorage for persistence between application restarts
export const storage = new DatabaseStorage();

// Initialize the database with default agents if needed
(async () => {
  try {
    await (storage as DatabaseStorage).seedDatabase();
    console.log("Database initialized with default agents");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
})();
