import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Agent, Task, Log, Issue, Project, DashboardMetrics, AgentContextType, WebSocketMessage } from "@/lib/types";
import { createWebSocketConnection, sendWebSocketMessage } from "@/lib/websocket";
import { getLogsByAgent, getIssuesByTask, getDashboardMetrics, getTasksByProject } from "@/lib/agentService";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

const initialMetrics: DashboardMetrics = {
  activeAgents: 0,
  totalAgents: 0,
  tasksInQueue: 0,
  completedTasks: 0,
  issuesDetected: 0,
  criticalIssues: 0,
  warningIssues: 0,
  verificationRate: 0
};

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider = ({ children }: { children: ReactNode }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Record<number, Log[]>>({});
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard metrics
  const { data: dashboardMetrics } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    queryFn: getDashboardMetrics,
    enabled: isLoading
  });

  useEffect(() => {
    if (dashboardMetrics) {
      setMetrics(dashboardMetrics);
      setIsLoading(false);
    }
  }, [dashboardMetrics]);

  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    switch (data.type) {
      case 'initial_data':
        setAgents(data.data.agents);
        setTasks(data.data.tasks);
        setProjects(data.data.projects);
        setMetrics(data.data.metrics);
        setIsLoading(false);
        break;
      case 'agent_created':
        setAgents(prevAgents => [...prevAgents, data.agent]);
        break;
      case 'agent_updated':
        setAgents(prevAgents => 
          prevAgents.map(agent => 
            agent.id === data.agent.id ? data.agent : agent
          )
        );
        break;
      case 'task_created':
        setTasks(prevTasks => [...prevTasks, data.task]);
        break;
      case 'task_updated':
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === data.task.id ? data.task : task
          )
        );
        break;
      case 'log_created':
        setLogs(prevLogs => {
          const agentLogs = prevLogs[data.log.agentId] || [];
          return {
            ...prevLogs,
            [data.log.agentId]: [data.log, ...agentLogs]
          };
        });
        break;
      case 'issue_created':
        setIssues(prevIssues => [...prevIssues, data.issue]);
        break;
      case 'issue_updated':
        setIssues(prevIssues => 
          prevIssues.map(issue => 
            issue.id === data.issue.id ? data.issue : issue
          )
        );
        break;
      case 'project_created':
        setProjects(prevProjects => [...prevProjects, data.project]);
        break;
      case 'project_updated':
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.id === data.project.id ? data.project : project
          )
        );
        break;
    }
    
    // Invalidate relevant queries to ensure data consistency
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!socket) {
      const newSocket = createWebSocketConnection(
        handleWebSocketMessage,
        () => setIsLoading(false),
        () => setIsLoading(true)
      );
      setSocket(newSocket);
    }
  }, [socket, handleWebSocketMessage]);

  const disconnectWebSocket = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
  }, [socket]);

  const getAgentLogs = useCallback(async (agentId: number) => {
    try {
      const agentLogs = await getLogsByAgent(agentId);
      setLogs(prevLogs => ({
        ...prevLogs,
        [agentId]: agentLogs
      }));
    } catch (error) {
      console.error(`Error fetching logs for agent ${agentId}:`, error);
    }
  }, []);

  const getIssuesForTask = useCallback(async (taskId: number) => {
    try {
      const taskIssues = await getIssuesByTask(taskId);
      setIssues(taskIssues);
    } catch (error) {
      console.error(`Error fetching issues for task ${taskId}:`, error);
    }
  }, []);

  const getTasksForProject = useCallback(async (projectId: number) => {
    try {
      const projectTasks = await getTasksByProject(projectId);
      setTasks(projectTasks);
    } catch (error) {
      console.error(`Error fetching tasks for project ${projectId}:`, error);
    }
  }, []);

  useEffect(() => {
    // Clean up WebSocket connection on unmount
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // Fetch logs for selected agent when it changes
  useEffect(() => {
    if (selectedAgent) {
      getAgentLogs(selectedAgent);
    }
  }, [selectedAgent, getAgentLogs]);
  
  // Fetch tasks for selected project when it changes
  useEffect(() => {
    if (selectedProject) {
      getTasksForProject(selectedProject);
    }
  }, [selectedProject, getTasksForProject]);

  const value: AgentContextType = {
    agents,
    tasks,
    logs,
    issues,
    projects,
    metrics,
    selectedAgent,
    selectedProject,
    isLoading,
    connectWebSocket,
    disconnectWebSocket,
    setSelectedAgent,
    setSelectedProject,
    getAgentLogs,
    getIssuesForTask,
    getTasksForProject
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgentContext must be used within an AgentProvider");
  }
  return context;
};
