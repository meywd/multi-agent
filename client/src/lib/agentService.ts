import { apiRequest } from "./queryClient";
import { Agent, Task, Log, Issue, Project, DashboardMetrics } from "./types";

// Dashboard metrics
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return await apiRequest({
    method: "GET",
    url: "/api/dashboard/metrics"
  });
}

// Agent operations
export async function getAgents(): Promise<Agent[]> {
  return await apiRequest({
    method: "GET",
    url: "/api/agents"
  });
}

export async function getAgent(id: number): Promise<Agent> {
  return await apiRequest({
    method: "GET",
    url: `/api/agents/${id}`
  });
}

export async function createAgent(agent: Omit<Agent, "id" | "createdAt">): Promise<Agent> {
  return await apiRequest({
    method: "POST",
    url: "/api/agents",
    body: agent
  });
}

export async function updateAgentStatus(id: number, status: string): Promise<Agent> {
  return await apiRequest({
    method: "PATCH",
    url: `/api/agents/${id}/status`,
    body: { status }
  });
}

// Task operations
export async function getTasks(): Promise<Task[]> {
  return await apiRequest({
    method: "GET",
    url: "/api/tasks"
  });
}

export async function getTasksByStatus(status: string): Promise<Task[]> {
  return await apiRequest({
    method: "GET",
    url: `/api/tasks?status=${status}`
  });
}

export async function getTasksByAgent(agentId: number): Promise<Task[]> {
  return await apiRequest({
    method: "GET",
    url: `/api/tasks?agentId=${agentId}`
  });
}

export async function getTask(id: number): Promise<Task> {
  return await apiRequest({
    method: "GET",
    url: `/api/tasks/${id}`
  });
}

export async function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt" | "progress">): Promise<Task> {
  return await apiRequest({
    method: "POST",
    url: "/api/tasks",
    body: task
  });
}

export async function updateTaskStatus(id: number, status: string, progress?: number): Promise<Task> {
  return await apiRequest({
    method: "PATCH",
    url: `/api/tasks/${id}/status`,
    body: { status, progress }
  });
}

export async function updateTaskProgress(id: number, progress: number): Promise<Task> {
  return await apiRequest({
    method: "PATCH",
    url: `/api/tasks/${id}/progress`,
    body: { progress }
  });
}

// Log operations
export async function getLogs(): Promise<Log[]> {
  return await apiRequest({
    method: "GET",
    url: "/api/logs"
  });
}

export async function getLogsByAgent(agentId: number): Promise<Log[]> {
  return await apiRequest({
    method: "GET",
    url: `/api/logs?agentId=${agentId}`
  });
}

export async function createLog(log: Omit<Log, "id" | "timestamp">): Promise<Log> {
  return await apiRequest({
    method: "POST",
    url: "/api/logs",
    body: log
  });
}

// Issue operations
export async function getIssues(): Promise<Issue[]> {
  return await apiRequest({
    method: "GET",
    url: "/api/issues"
  });
}

export async function getUnresolvedIssues(): Promise<Issue[]> {
  return await apiRequest({
    method: "GET",
    url: "/api/issues?resolved=false"
  });
}

export async function getIssuesByTask(taskId: number): Promise<Issue[]> {
  return await apiRequest({
    method: "GET",
    url: `/api/issues?taskId=${taskId}`
  });
}

export async function createIssue(issue: Omit<Issue, "id" | "resolved" | "createdAt">): Promise<Issue> {
  return await apiRequest({
    method: "POST",
    url: "/api/issues",
    body: issue
  });
}

export async function resolveIssue(id: number): Promise<Issue> {
  return await apiRequest({
    method: "PATCH",
    url: `/api/issues/${id}/resolve`
  });
}

// Project operations
export async function getProjects(): Promise<Project[]> {
  return await apiRequest({
    method: "GET",
    url: "/api/projects"
  });
}

export async function getProject(id: number): Promise<Project> {
  return await apiRequest({
    method: "GET",
    url: `/api/projects/${id}`
  });
}

export async function createProject(project: Omit<Project, "id" | "createdAt" | "updatedAt" | "completedAt">): Promise<Project> {
  return await apiRequest({
    method: "POST",
    url: "/api/projects",
    body: project
  });
}

export async function updateProjectStatus(id: number, status: string): Promise<Project> {
  return await apiRequest({
    method: "PATCH",
    url: `/api/projects/${id}/status`,
    body: { status }
  });
}

export async function getTasksByProject(projectId: number): Promise<Task[]> {
  return await apiRequest({
    method: "GET",
    url: `/api/projects/${projectId}/tasks`
  });
}

export async function getLogsByProject(projectId: number): Promise<Log[]> {
  return await apiRequest({
    method: "GET",
    url: `/api/logs?projectId=${projectId}`
  });
}

export async function getProjectConversations(projectId: number): Promise<Log[]> {
  return await apiRequest({
    method: "GET",
    url: `/api/projects/${projectId}/conversations`
  });
}

export async function respondToConversation(
  projectId: number, 
  message: string, 
  targetAgentId?: number
): Promise<Log> {
  return await apiRequest({
    method: "POST",
    url: `/api/projects/${projectId}/respond`,
    body: { 
      message,
      agentId: targetAgentId 
    }
  });
}
