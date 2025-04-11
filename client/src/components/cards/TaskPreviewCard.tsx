import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Clock, AlertCircle, Code, Cpu } from "lucide-react";
import { Task } from '@shared/schema';
import { cn } from '@/lib/utils';

interface TaskPreviewCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  className?: string;
}

export function TaskPreviewCard({ task, onClick, className }: TaskPreviewCardProps) {
  // Helper to get status icon and color
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, color: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900' };
      case 'in_progress':
        return { icon: <Cpu className="h-4 w-4 text-blue-500 animate-pulse" />, color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900' };
      case 'queued':
        return { icon: <Clock className="h-4 w-4 text-amber-500" />, color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900' };
      case 'debugging':
        return { icon: <Code className="h-4 w-4 text-purple-500" />, color: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900' };
      case 'failed':
        return { icon: <AlertCircle className="h-4 w-4 text-red-500" />, color: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900' };
      default:
        return { icon: <Clock className="h-4 w-4 text-gray-500" />, color: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700' };
    }
  };

  // Get status details
  const statusDetails = getStatusDetails(task.status);

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(task);
    }
  };

  return (
    <Card 
      className={cn(
        "h-full border transition-all hover:shadow-md cursor-pointer", 
        statusDetails.color,
        className
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {task.title}
          </CardTitle>
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>{statusDetails.icon}</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="capitalize">{task.status}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-xs text-muted-foreground line-clamp-3">
          {task.description || "No description provided"}
        </p>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between items-center">
        <Badge variant="outline" className={cn(
          "text-xs px-2 py-0.5 rounded-sm font-medium capitalize",
          getPriorityColor(task.priority)
        )}>
          {task.priority}
        </Badge>
        {task.progress > 0 && (
          <div className="flex items-center">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
              <div 
                className="h-full bg-blue-600 dark:bg-blue-400" 
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="ml-1.5 text-xs text-muted-foreground">{task.progress}%</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}