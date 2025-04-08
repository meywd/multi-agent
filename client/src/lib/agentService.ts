import { apiRequest } from "./queryClient";
import { Agent, Task, Log, Issue, DashboardMetrics } from "./types";

// Dashboard metrics
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await apiRequest("GET", "/api/dashboard/metrics");
  return response.json();
}

// Agent operations
export async function getAgents(): Promise<Agent[]> {
  const response = await apiRequest("GET", "/api/agents");
  return response.json();
}

export async function getAgent(id: number): Promise<Agent> {
  const response = await apiRequest("GET", `/api/agents/${id}`);
  return response.json();
}

export async function createAgent(agent: Omit<Agent, "id" | "createdAt">): Promise<Agent> {
  const response = await apiRequest("POST", "/api/agents", agent);
  return response.json();
}

export async function updateAgentStatus(id: number, status: string): Promise<Agent> {
  const response = await apiRequest("PATCH", `/api/agents/${id}/status`, { status });
  return response.json();
}

// Task operations
export async function getTasks(): Promise<Task[]> {
  const response = await apiRequest("GET", "/api/tasks");
  return response.json();
}

export async function getTasksByStatus(status: string): Promise<Task[]> {
  const response = await apiRequest("GET", `/api/tasks?status=${status}`);
  return response.json();
}

export async function getTasksByAgent(agentId: number): Promise<Task[]> {
  const response = await apiRequest("GET", `/api/tasks?agentId=${agentId}`);
  return response.json();
}

export async function getTask(id: number): Promise<Task> {
  const response = await apiRequest("GET", `/api/tasks/${id}`);
  return response.json();
}

export async function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt" | "progress">): Promise<Task> {
  const response = await apiRequest("POST", "/api/tasks", task);
  return response.json();
}

export async function updateTaskStatus(id: number, status: string, progress?: number): Promise<Task> {
  const response = await apiRequest("PATCH", `/api/tasks/${id}/status`, { status, progress });
  return response.json();
}

export async function updateTaskProgress(id: number, progress: number): Promise<Task> {
  const response = await apiRequest("PATCH", `/api/tasks/${id}/progress`, { progress });
  return response.json();
}

// Log operations
export async function getLogs(): Promise<Log[]> {
  const response = await apiRequest("GET", "/api/logs");
  return response.json();
}

export async function getLogsByAgent(agentId: number): Promise<Log[]> {
  const response = await apiRequest("GET", `/api/logs?agentId=${agentId}`);
  return response.json();
}

export async function createLog(log: Omit<Log, "id" | "timestamp">): Promise<Log> {
  const response = await apiRequest("POST", "/api/logs", log);
  return response.json();
}

// Issue operations
export async function getIssues(): Promise<Issue[]> {
  const response = await apiRequest("GET", "/api/issues");
  return response.json();
}

export async function getUnresolvedIssues(): Promise<Issue[]> {
  const response = await apiRequest("GET", "/api/issues?resolved=false");
  return response.json();
}

export async function getIssuesByTask(taskId: number): Promise<Issue[]> {
  const response = await apiRequest("GET", `/api/issues?taskId=${taskId}`);
  return response.json();
}

export async function createIssue(issue: Omit<Issue, "id" | "resolved" | "createdAt">): Promise<Issue> {
  const response = await apiRequest("POST", "/api/issues", issue);
  return response.json();
}

export async function resolveIssue(id: number): Promise<Issue> {
  const response = await apiRequest("PATCH", `/api/issues/${id}/resolve`);
  return response.json();
}
