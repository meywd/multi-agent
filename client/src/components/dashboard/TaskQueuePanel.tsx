import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@/lib/types";

interface TaskQueuePanelProps {
  tasks: Task[];
}

export function TaskQueuePanel({ tasks }: TaskQueuePanelProps) {
  const calculateETA = (task: Task) => {
    if (task.status === 'completed') {
      return 'Completed';
    }
    
    if (!task.estimatedTime) {
      return 'Unknown';
    }
    
    // Calculate remaining time based on progress
    const remainingPercentage = 100 - task.progress;
    const totalMinutes = task.estimatedTime;
    const remainingMinutes = (remainingPercentage / 100) * totalMinutes;
    
    if (remainingMinutes < 1) {
      return 'Less than a minute';
    } else if (remainingMinutes < 60) {
      return `~${Math.ceil(remainingMinutes)} min`;
    } else {
      const hours = Math.floor(remainingMinutes / 60);
      const mins = Math.ceil(remainingMinutes % 60);
      return `~${hours}h ${mins}m`;
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in_progress':
      case 'inprogress':
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Task Queue</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto max-h-[400px] px-0">
        {tasks.length === 0 ? (
          <div className="flex justify-center items-center h-48 text-neutral-500 text-sm">
            No tasks in queue. Add tasks to see them here.
          </div>
        ) : (
          <div className="space-y-2 px-6">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-md border border-neutral-200 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between mb-2">
                  <h3 className="font-medium text-neutral-900">{task.title}</h3>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
                
                {task.description && (
                  <p className="text-sm text-neutral-600 mb-3">{task.description}</p>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  <div className="w-full max-w-[180px]">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 rounded-full">
                      <div 
                        className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500">
                    ETA: {calculateETA(task)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}