// Type definitions for the application

export interface Agent {
  id: number;
  name: string;
  status: string;
  role: string;
  description?: string;
  createdAt: Date;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: number;
  progress: number;
  estimatedTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Log {
  id: number;
  agentId: number | null;
  targetAgentId?: number | null;
  projectId?: number | null;
  type: string;
  message: string;
  details?: string | null;
  timestamp: Date;
}

export interface Issue {
  id: number;
  taskId: number;
  type: string;
  title: string;
  description: string;
  code?: string;
  solution?: string;
  resolved: boolean;
  createdAt: Date;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export interface DashboardMetrics {
  activeAgents: number;
  totalAgents: number;
  tasksInQueue: number;
  completedTasks: number;
  issuesDetected: number;
  criticalIssues: number;
  warningIssues: number;
  verificationRate: number;
}

export interface AgentContextType {
  agents: Agent[];
  tasks: Task[];
  projects: Project[];
  logs: Record<number, Log[]>;
  issues: Issue[];
  metrics: DashboardMetrics;
  selectedAgent: number | null;
  selectedProject: number | null;
  isLoading: boolean;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  setSelectedAgent: (agentId: number | null) => void;
  setSelectedProject: (projectId: number | null) => void;
  getAgentLogs: (agentId: number) => void;
  getIssuesForTask: (taskId: number) => void;
  getTasksForProject: (projectId: number) => void;
}

export type WebSocketMessage = 
  | { type: 'initial_data', data: { agents: Agent[], tasks: Task[], projects: Project[], metrics: DashboardMetrics } }
  | { type: 'agent_created', agent: Agent }
  | { type: 'agent_updated', agent: Agent }
  | { type: 'task_created', task: Task }
  | { type: 'task_updated', task: Task }
  | { type: 'log_created', log: Log }
  | { type: 'issue_created', issue: Issue }
  | { type: 'issue_updated', issue: Issue }
  | { type: 'project_created', project: Project }
  | { type: 'project_updated', project: Project };
