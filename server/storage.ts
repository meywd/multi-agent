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
  InsertUser
} from "@shared/schema";

export interface IStorage {
  // User methods (kept from original)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  updateTaskStatus(id: number, status: string, progress?: number): Promise<Task | undefined>;
  updateTaskProgress(id: number, progress: number): Promise<Task | undefined>;
  
  // Log methods
  getLogs(): Promise<Log[]>;
  getLogsByAgent(agentId: number): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  
  // Issue methods
  getIssues(): Promise<Issue[]>;
  getIssuesByTask(taskId: number): Promise<Issue[]>;
  getUnresolvedIssues(): Promise<Issue[]>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  resolveIssue(id: number): Promise<Issue | undefined>;
  
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
  
  currentUserId: number;
  currentAgentId: number;
  currentTaskId: number;
  currentLogId: number;
  currentIssueId: number;

  constructor() {
    this.users = new Map();
    this.agents = new Map();
    this.tasks = new Map();
    this.logs = new Map();
    this.issues = new Map();
    
    this.currentUserId = 1;
    this.currentAgentId = 1;
    this.currentTaskId = 1;
    this.currentLogId = 1;
    this.currentIssueId = 1;
    
    // Initialize with default agents
    this.initializeDefaultAgents();
    // Initialize with sample tasks
    this.initializeSampleTasks();
    // Initialize with sample logs
    this.initializeSampleLogs();
    // Initialize with sample issues
    this.initializeSampleIssues();
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

  // User methods (kept from original)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
    const agent: Agent = { ...insertAgent, id, createdAt };
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
    const task: Task = { ...insertTask, id, progress, createdAt, updatedAt };
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
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const id = this.currentLogId++;
    const timestamp = insertLog.timestamp || new Date();
    const log: Log = { ...insertLog, id, timestamp };
    this.logs.set(id, log);
    return log;
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
    const resolved = false;
    const issue: Issue = { ...insertIssue, id, resolved, createdAt };
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

export const storage = new MemStorage();
