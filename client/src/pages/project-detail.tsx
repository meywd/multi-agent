import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getProject, 
  getTasksByProject, 
  getProjectConversations, 
  respondToConversation 
} from "@/lib/agentService";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Project, Task, Log } from "@/lib/types";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  MessageSquare, 
  User, 
  Send, 
  Reply 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = parseInt(id as string);
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<{agentId: number, name: string} | null>(null);

  const { 
    data: project, 
    isLoading: isLoadingProject
  } = useQuery({
    queryKey: ["/api/projects", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId && !isNaN(projectId)
  });

  const { 
    data: tasks = [], 
    isLoading: isLoadingTasks
  } = useQuery({
    queryKey: ["/api/projects", projectId, "tasks"],
    queryFn: () => getTasksByProject(projectId),
    enabled: !!projectId && !isNaN(projectId)
  });
  
  const {
    data: conversations = [],
    isLoading: isLoadingConversations
  } = useQuery({
    queryKey: ["/api/projects", projectId, "conversations"],
    queryFn: () => getProjectConversations(projectId),
    enabled: !!projectId && !isNaN(projectId)
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "review":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-slate-100 text-slate-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "review":
        return "bg-purple-100 text-purple-800";
      case "done":
        return "bg-green-100 text-green-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    return status === "in_progress" 
      ? "In Progress" 
      : status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Add mutation for replying to agent conversation
  const replyMutation = useMutation({
    mutationFn: ({ message, targetAgentId }: { message: string, targetAgentId?: number }) => 
      respondToConversation(projectId, message, targetAgentId),
    onSuccess: () => {
      // Clear the form and reset replyingTo state
      setMessage("");
      setReplyingTo(null);
      
      // Invalidate and refetch conversations query to show the new message
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "conversations"] });
      
      toast({
        title: "Response sent",
        description: "Your message has been sent to the agent.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error sending response",
        description: "There was a problem sending your message. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to send response:", error);
    }
  });

  const handleReply = (agentId: number, agentName: string) => {
    setReplyingTo({ agentId, name: agentName });
  };

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!message.trim()) return;
    
    replyMutation.mutate({
      message,
      targetAgentId: replyingTo?.agentId
    });
  };

  if (isLoadingProject) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!project) {
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
            <p className="text-muted-foreground mb-4">Project not found or has been deleted.</p>
            <Link href="/projects">
              <Button variant="outline" size="sm">Return to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm mb-2">
            <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Back to Projects
          </Button>
        </Link>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-gray-500">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
              {project.completedAt && (
                <>
                  <span className="mx-1">•</span>
                  <span>Completed: {new Date(project.completedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          <Badge className={`text-xs sm:text-sm px-2 py-1 ${getStatusColor(project.status)}`}>
            {formatStatus(project.status)}
          </Badge>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="text-base sm:text-lg">Project Description</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-3">
          <p className="text-xs sm:text-sm text-neutral-700 whitespace-pre-line">
            {project.description || "No description provided."}
          </p>
        </CardContent>
      </Card>

      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center">
          <span>Tasks</span>
          <Badge className="ml-2 text-xs">{tasks.length}</Badge>
        </h2>
      </div>

      {isLoadingTasks ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-3 sm:p-4">
                <div className="h-4 sm:h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent>
            <p className="text-muted-foreground text-xs sm:text-sm">No tasks have been assigned to this project yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="overflow-hidden">
              <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-sm sm:text-base">{task.title}</CardTitle>
                  <Badge className={`text-xs ${getTaskStatusColor(task.status)}`}>
                    {formatStatus(task.status)}
                  </Badge>
                </div>
                <CardDescription className="text-xs flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {task.estimatedTime 
                      ? `${task.estimatedTime} hours estimated`
                      : "No time estimate"}
                  </span>
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="p-3 sm:p-4 pt-2 sm:pt-3">
                <p className="text-xs sm:text-sm text-neutral-700 line-clamp-2">
                  {task.description || "No description provided."}
                </p>
                <div className="mt-3 flex justify-between items-center">
                  <div className="text-xs text-neutral-500">
                    Priority: <span className="font-medium">{task.priority}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs">{task.progress}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div className="mt-8 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center">
          <MessageSquare className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          <span>Agent Communications</span>
          <Badge className="ml-2 text-xs">{conversations.length}</Badge>
        </h2>
      </div>
      
      {isLoadingConversations ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-md"></div>
          <div className="h-24 bg-gray-200 rounded-md"></div>
        </div>
      ) : conversations.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent>
            <p className="text-muted-foreground text-xs sm:text-sm">No agent conversations recorded for this project yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversations.map((log) => (
            <Card key={log.id} className="overflow-hidden border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">
                        {log.agentId ? `Agent #${log.agentId}` : "System"} 
                        {log.targetAgentId && <span className="text-muted-foreground"> → Agent #{log.targetAgentId}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <p className="mt-1 text-sm">{log.message}</p>
                    {log.details && (
                      <div className="mt-2 bg-muted/50 p-2 rounded text-xs whitespace-pre-wrap">
                        {log.details}
                      </div>
                    )}
                    
                    {/* Add reply button if the message is from an agent */}
                    {log.agentId && (
                      <div className="mt-3 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-xs flex items-center gap-1 text-primary"
                          onClick={() => handleReply(log.agentId!, `Agent #${log.agentId}`)}
                        >
                          <Reply className="h-3 w-3" />
                          Reply
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Reply form */}
          <Card className="overflow-hidden mt-6">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">
                {replyingTo ? `Reply to ${replyingTo.name}` : "Send a message"}
              </CardTitle>
              {replyingTo && (
                <CardDescription className="text-xs">
                  Your response will be sent directly to this agent.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <form onSubmit={handleSendMessage} className="space-y-3">
                <div className="flex flex-col space-y-2">
                  <Input
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full"
                  />
                  {replyingTo && (
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 text-xs"
                        onClick={() => setReplyingTo(null)}
                        type="button"
                      >
                        Clear recipient
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={!message.trim() || replyMutation.isPending}
                    className="gap-1"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {replyMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}