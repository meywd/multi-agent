import { useEffect } from "react";
import { useAgentContext } from "@/context/AgentContext";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { AgentCommunicationFlow } from "@/components/dashboard/AgentCommunicationFlow";
import { TaskQueuePanel } from "@/components/dashboard/TaskQueuePanel";
import { AgentMonitorPanel } from "@/components/dashboard/AgentMonitorPanel";
import { DebugConsole } from "@/components/dashboard/DebugConsole";
import { AgentInteractionPanel } from "@/components/dashboard/AgentInteractionPanel";
import { CodePlayground } from "@/components/dashboard/CodePlayground";

export default function Dashboard() {
  const { agents, tasks, metrics, isLoading, connectWebSocket } = useAgentContext();
  
  // Connect to WebSocket when the dashboard loads
  useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent text-primary"></div>
          <p className="mt-2 text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">AI Agent Dashboard</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Monitor and manage your multi-agent application development system
        </p>
      </div>

      {/* System Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatusCard
          title="Active Agents"
          value={`${metrics.activeAgents}/${metrics.totalAgents}`}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-primary"
            >
              <path d="M14 8a2 2 0 1 0-4 0" />
              <path d="M12 10v4" />
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="M6 16v-2" />
              <path d="M18 16v-2" />
              <path d="M10 16v-2" />
              <path d="M14 16v-2" />
            </svg>
          }
          color="primary"
          progress={metrics.totalAgents > 0 ? (metrics.activeAgents / metrics.totalAgents) * 100 : 0}
        />

        <StatusCard
          title="Tasks in Queue"
          value={metrics.tasksInQueue}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-secondary"
            >
              <path d="M8 6h10" />
              <path d="M6 12h9" />
              <path d="M11 18h7" />
            </svg>
          }
          color="secondary"
          subtitle={
            <div className="flex items-center">
              <span className="text-xs text-success flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1 h-3 w-3"
                >
                  <path d="m5 12 5 5" />
                  <path d="m5 12 5-5" />
                  <path d="M5 12h14" />
                </svg>
                <span>+{metrics.completedTasks} completed</span>
              </span>
              <span className="ml-3 text-xs text-neutral-500">Last 24h</span>
            </div>
          }
        />

        <StatusCard
          title="Issues Detected"
          value={metrics.issuesDetected}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-error"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          }
          color="error"
          subtitle={
            <div className="flex items-center">
              <span className="text-xs text-error flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1 h-3 w-3"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <span>{metrics.criticalIssues} critical</span>
              </span>
              <span className="ml-3 text-xs text-warning">
                {metrics.warningIssues} warnings
              </span>
            </div>
          }
        />

        <StatusCard
          title="Verification Rate"
          value={`${metrics.verificationRate}%`}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-success"
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          }
          color="success"
          progress={metrics.verificationRate}
        />
      </div>

      {/* Agent Activity & Communication Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <AgentCommunicationFlow agents={agents} />
        </div>
        <div>
          <TaskQueuePanel tasks={tasks} />
        </div>
      </div>

      {/* Agent Activity Details Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-1">
          <AgentInteractionPanel />
        </div>
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <AgentMonitorPanel />
          <DebugConsole />
        </div>
      </div>
      
      {/* Code Playground Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">Development Tools</h2>
        <CodePlayground />
      </div>
    </div>
  );
}
