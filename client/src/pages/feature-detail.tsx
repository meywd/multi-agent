import { useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTask, getSubtasks } from "@/lib/agentService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function FeatureDetailPage() {
  const { id } = useParams();
  const featureId = parseInt(id as string);
  const queryClient = useQueryClient();

  const {
    data: feature,
    isLoading: isLoadingFeature,
  } = useQuery({
    queryKey: ["/api/tasks", featureId],
    queryFn: () => getTask(featureId),
    enabled: !!featureId && !isNaN(featureId),
  });

  const {
    data: subtasks = [],
    isLoading: isLoadingSubtasks,
  } = useQuery({
    queryKey: ["/api/tasks", featureId, "subtasks"],
    queryFn: () => getSubtasks(featureId),
    enabled: !!featureId && !isNaN(featureId),
  });

  if (isLoadingFeature) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!feature) {
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
            <p className="text-muted-foreground mb-4">Feature not found or has been deleted.</p>
            <Link href="/projects">
              <Button variant="outline" size="sm">Return to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6">
      <div className="mb-6">
        {feature.projectId && (
          <Link href={`/projects/${feature.projectId}`}>
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
          </Link>
        )}
        
        <h1 className="text-2xl font-bold">Feature: {feature.title}</h1>
      </div>

      {/* Feature details will be displayed here */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Feature Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>ID: {feature.id}</p>
          <p>Status: {feature.status}</p>
          <p>Priority: {feature.priority}</p>
          <p>Progress: {feature.progress}%</p>
          {feature.description && (
            <>
              <Separator className="my-4" />
              <p>{feature.description}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Subtasks section */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Subtasks</h2>
      </div>
      
      {isLoadingSubtasks ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded-md"></div>
          <div className="h-16 bg-gray-200 rounded-md"></div>
        </div>
      ) : subtasks.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent>
            <p className="text-muted-foreground">No subtasks have been assigned to this feature yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subtasks.map((subtask) => (
            <Card key={subtask.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{subtask.title}</CardTitle>
                  <Badge>{subtask.status}</Badge>
                </div>
                <CardDescription>Priority: {subtask.priority} • Progress: {subtask.progress}%</CardDescription>
              </CardHeader>
              {subtask.description && (
                <CardContent>
                  <p>{subtask.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}