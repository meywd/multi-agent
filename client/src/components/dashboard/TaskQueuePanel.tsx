import { useState } from "react";
import { Task } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface TaskQueuePanelProps {
  tasks: Task[];
}

export function TaskQueuePanel({ tasks }: TaskQueuePanelProps) {
  const [displayedTasks, setDisplayedTasks] = useState<Task[]>(tasks.slice(0, 3));

  const viewAllTasks = () => {
    setDisplayedTasks(tasks);
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'in_progress':
        return "bg-secondary-light bg-opacity-20 text-secondary";
      case 'debugging':
        return "bg-warning bg-opacity-20 text-warning";
      case 'queued':
        return "bg-neutral-200 text-neutral-700";
      case 'verifying':
        return "bg-info bg-opacity-20 text-info";
      case 'completed':
        return "bg-success bg-opacity-20 text-success";
      case 'failed':
        return "bg-error bg-opacity-20 text-error";
      default:
        return "bg-neutral-200 text-neutral-700";
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'in_progress':
        return "In Progress";
      case 'debugging':
        return "Debugging";
      case 'queued':
        return "Queued";
      case 'verifying':
        return "Verifying";
      case 'completed':
        return "Completed";
      case 'failed':
        return "Failed";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return "bg-secondary";
      case 'debugging':
        return "bg-warning";
      case 'queued':
        return "bg-neutral-400";
      case 'verifying':
        return "bg-info";
      case 'completed':
        return "bg-success";
      case 'failed':
        return "bg-error";
      default:
        return "bg-neutral-400";
    }
  };

  const calculateETA = (task: Task) => {
    if (!task.estimatedTime) return "Unknown";
    
    const totalMinutes = task.estimatedTime;
    const minutesLeft = Math.round(totalMinutes * (1 - task.progress / 100));
    
    if (minutesLeft <= 0) return "Soon";
    if (minutesLeft < 60) return `${minutesLeft}min`;
    return `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}min`;
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-neutral-800">Task Queue</h2>
          <button 
            className="text-sm text-primary hover:text-primary-dark font-medium"
            onClick={viewAllTasks}
          >
            View All
          </button>
        </div>
        
        <div className="space-y-4">
          {displayedTasks.length === 0 ? (
            <div className="p-6 text-center text-neutral-500">
              No tasks in the queue
            </div>
          ) : (
            displayedTasks.map((task) => (
              <div key={task.id} className="p-3 border border-neutral-200 rounded-md hover:bg-neutral-50">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusBadgeStyles(task.status)}>
                    {getStatusDisplayName(task.status)}
                  </Badge>
                  <span className="text-xs text-neutral-500">
                    {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                  </span>
                </div>
                <h3 className="text-sm font-medium mt-2 text-neutral-800">{task.title}</h3>
                <div className="mt-1 flex items-center text-xs text-neutral-500">
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
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M7 7h10" />
                    <path d="M7 12h6" />
                    <path d="M7 17h4" />
                  </svg>
                  <span>Assigned to: {task.assignedTo ? `Agent #${task.assignedTo}` : "Unassigned"}</span>
                </div>
                <div className="mt-2">
                  <Progress 
                    value={task.progress} 
                    className="h-1.5 bg-neutral-200" 
                    indicatorClassName={getProgressColor(task.status)} 
                  />
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Progress: {task.progress}%</span>
                    <span className="text-neutral-600">ETA: {calculateETA(task)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
