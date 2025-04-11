import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

// Define the task data structure
interface TaskPreviewProps {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number | null;
  assignedTo?: number | null;
  isFeature?: boolean;
  agentName?: string;
  className?: string;
  onClick?: () => void;
}

// Helper utilities for status and priority colors
const statusColors: Record<string, string> = {
  'todo': 'bg-gray-200 text-gray-800',
  'in_progress': 'bg-blue-100 text-blue-800',
  'review': 'bg-yellow-100 text-yellow-800',
  'done': 'bg-green-100 text-green-800',
  'blocked': 'bg-red-100 text-red-800',
};

const priorityColors: Record<string, string> = {
  'low': 'bg-gray-100 text-gray-800',
  'medium': 'bg-blue-100 text-blue-800',
  'high': 'bg-orange-100 text-orange-800',
  'critical': 'bg-red-100 text-red-800',
};

export function TaskPreviewCard({
  id,
  title,
  description,
  status,
  priority,
  progress = 0,
  assignedTo,
  isFeature = false,
  agentName,
  className = '',
  onClick
}: TaskPreviewProps) {
  // Format the status and priority for display
  const displayStatus = status.replace('_', ' ');
  const displayPriority = priority.charAt(0).toUpperCase() + priority.slice(1);
  
  // Generate the status badge color based on status
  const statusColor = statusColors[status] || 'bg-gray-500';
  const priorityColor = priorityColors[priority] || 'bg-gray-500';
  
  // Helper to truncate text
  const truncate = (text: string, length: number) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  return (
    <Card 
      className={`w-full border shadow-sm hover:shadow-md transition-shadow ${className}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {isFeature ? '✨ ' : ''}{title}
          </CardTitle>
          <Badge 
            variant="secondary"
            className={`ml-2 flex-shrink-0 ${statusColor}`}
          >
            {displayStatus}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 mt-1">
          {description || 'No description available'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">{progress || 0}%</span>
          </div>
          <Progress value={progress || 0} className="h-2" />
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className={`${priorityColor} text-xs`}>
            {displayPriority}
          </Badge>
          {isFeature && (
            <Badge variant="outline" className="bg-purple-100 text-xs">
              Feature
            </Badge>
          )}
        </div>
        
        {assignedTo && (
          <div className="flex items-center">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {agentName ? agentName.charAt(0).toUpperCase() : 'A'}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export function FeaturePreviewCard(props: TaskPreviewProps) {
  return (
    <TaskPreviewCard {...props} isFeature={true} />
  );
}

// Connected card that links to the task detail page
export function LinkedTaskPreviewCard(props: TaskPreviewProps) {
  return (
    <Link href={`/tasks/${props.id}`}>
      <TaskPreviewCard {...props} />
    </Link>
  );
}

// Connected card that links to the feature detail page
export function LinkedFeaturePreviewCard(props: TaskPreviewProps) {
  return (
    <Link href={`/features/${props.id}`}>
      <FeaturePreviewCard {...props} />
    </Link>
  );
}