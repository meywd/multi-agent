import { useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTask, getIssuesByTask } from "@/lib/agentService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function TaskDetailPage() {
  const { id } = useParams();
  const taskId = parseInt(id as string);
  const queryClient = useQueryClient();

  const {
    data: task,
    isLoading: isLoadingTask,
  } = useQuery({
    queryKey: ["/api/tasks", taskId],
    queryFn: () => getTask(taskId),
    enabled: !!taskId && !isNaN(taskId),
  });

  const {
    data: issues = [],
    isLoading: isLoadingIssues,
  } = useQuery({
    queryKey: ["/api/tasks", taskId, "issues"],
    queryFn: () => getIssuesByTask(taskId),
    enabled: !!taskId && !isNaN(taskId),
  });

  if (isLoadingTask) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="w-full p-4 sm:p-6 md:p-8">
        <div className="mb-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
        
        <Card className="mx-auto max-w-md text-center p-8">
          <CardContent>
            <p className="text-muted-foreground mb-4">Task not found or has been deleted.</p>
            <Link href="/projects">
              <Button variant="outline" size="sm">Return to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine where to return to based on the task type
  const getBackUrl = () => {
    if (task.parentId && task.parentId > 0) {
      // If it's a subtask, go back to the feature
      return `/features/${task.parentId}`;
    } else if (task.projectId && task.projectId > 0) {
      // If it's a task or feature, go back to the project
      return `/projects/${task.projectId}`;
    } else {
      // Default fallback
      return "/projects";
    }
  };

  return (
    <div className="w-full px-4 py-6">
      <div className="mb-6">
        <Link href={getBackUrl()}>
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        
        <h1 className="text-2xl font-bold">
          {task.isFeature === true ? "Feature: " : "Task: "}
          {task.title}
        </h1>
      </div>

      {/* Task details will be displayed here */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>ID: {task.id}</p>
          <p>Status: {task.status}</p>
          <p>Priority: {task.priority}</p>
          <p>Progress: {task.progress}%</p>
          <p>Assigned To: {task.assignedTo || "Unassigned"}</p>
          {task.estimatedTime && <p>Estimated Time: {task.estimatedTime} hours</p>}
          {task.description && (
            <>
              <Separator className="my-4" />
              <p>{task.description}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Issues section */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Issues</h2>
      </div>
      
      {isLoadingIssues ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded-md"></div>
          <div className="h-16 bg-gray-200 rounded-md"></div>
        </div>
      ) : issues.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent>
            <p className="text-muted-foreground">No issues have been reported for this task.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <Card key={issue.id} className={issue.resolved ? "border-green-200" : "border-amber-200"}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2">
                    {issue.resolved ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                    <CardTitle>{issue.title}</CardTitle>
                  </div>
                  <Badge className={issue.resolved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                    {issue.resolved ? "Resolved" : "Open"}
                  </Badge>
                </div>
                <CardDescription>Type: {issue.type} • Reported: {new Date(issue.createdAt).toLocaleDateString()}</CardDescription>
              </CardHeader>
              {issue.description && (
                <CardContent>
                  <p>{issue.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}