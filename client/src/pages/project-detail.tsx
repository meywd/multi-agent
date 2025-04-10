import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { 
  getProject, 
  getTasksByProject, 
  getProjectConversations, 
  respondToConversation,
  getFeatures,
  getSubtasks
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
  ArrowRight,
  ArrowUp,
  Clock, 
  Calendar, 
  MessageSquare, 
  User, 
  Send, 
  Reply,
  ChevronRight,
  ChevronDown,
  Layers,
  Github,
  Code,
  FileCode,
  Info,
  ListChecks,
  MessageCircle,
  LayoutList,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { GitHubLinkForm } from "@/components/GitHubLinkForm";
import { GitHubRepoViewer } from "@/components/GitHubRepoViewer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = parseInt(id as string);
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<{agentId: number, name: string} | null>(null);

  // Add state for scroll position and sections
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [openSections, setOpenSections] = useState({
    details: true,
    features: true,
    tasks: true,
    conversations: true
  });
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Toggle section visibility
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Track scroll position for "Back to Top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { 
    data: project, 
    isLoading: isLoadingProject
  } = useQuery({
    queryKey: ["/api/projects", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId && !isNaN(projectId)
  });

  // Query for project features
  const { 
    data: features = [], 
    isLoading: isLoadingFeatures
  } = useQuery({
    queryKey: ["/api/features", projectId],
    queryFn: () => getFeatures(projectId),
    enabled: !!projectId && !isNaN(projectId)
  });
  
  // Query for regular tasks (non-features and non-subtasks)
  const { 
    data: tasks = [], 
    isLoading: isLoadingTasks
  } = useQuery({
    queryKey: ["/api/projects", projectId, "tasks"],
    queryFn: () => getTasksByProject(projectId),
    enabled: !!projectId && !isNaN(projectId)
  });

  // Keep track of expanded features to display their subtasks
  const [expandedFeatures, setExpandedFeatures] = useState<Record<number, boolean>>({});
  
  // Query for subtasks of expanded features
  const subtasksQueries = useQueries({
    queries: features
      .filter(feature => expandedFeatures[feature.id])
      .map(feature => ({
        queryKey: ["/api/tasks", feature.id, "subtasks"],
        queryFn: () => getSubtasks(feature.id),
        enabled: !!expandedFeatures[feature.id]
      })),
    combine: (results) => results
  });
  
  // Toggle feature expansion
  const toggleFeatureExpansion = (featureId: number) => {
    setExpandedFeatures(prev => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
  };
  
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
    <div className="w-full px-3 sm:px-4 md:px-6 py-4 sm:py-6 relative">
      {/* Go to Top Button */}
      {showScrollTop && (
        <Button 
          variant="outline"
          size="icon"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-md"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
      
      <div className="mb-4 sm:mb-6">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm mb-2">
            <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Back to Projects
          </Button>
        </Link>
        
        {/* Project Header - Always Visible */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-4">
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

      {/* Project Details - Collapsible */}
      <Collapsible 
        open={openSections.details} 
        onOpenChange={() => toggleSection('details')}
        className="mb-6"
      >
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg flex items-center">
                <Info className="mr-2 h-4 w-4" />
                Project Details
              </CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {openSections.details ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-4 sm:p-6 pt-3">
              <p className="text-xs sm:text-sm text-neutral-700 whitespace-pre-line">
                {project.description || "No description provided."}
              </p>
              
              {/* Additional project info can go here */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <p className="font-medium">GitHub Repository:</p>
                  <p>{(project as any).githubRepo || "Not connected"}</p>
                </div>
                <div>
                  <p className="font-medium">Branch:</p>
                  <p>{(project as any).githubBranch || "main"}</p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Features Section - Collapsible */}
        <Collapsible 
          open={openSections.features} 
          onOpenChange={() => toggleSection('features')}
          className="sm:col-span-2 lg:col-span-2 mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center">
              <Layers className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span>Features</span>
              <Badge className="ml-2 text-xs">{features.length}</Badge>
            </h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {openSections.features ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            {isLoadingFeatures ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="p-4">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : features.length === 0 ? (
              <Card className="text-center p-6 mb-6">
                <CardContent>
                  <p className="text-muted-foreground text-sm">No features have been defined for this project yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 mb-6">
                {features.map((feature) => {
                  const isExpanded = expandedFeatures[feature.id] || false;
                  // Find the matching query for this feature
                  const featureIndex = features
                    .filter(f => expandedFeatures[f.id])
                    .findIndex(f => f.id === feature.id);
                  
                  const subtaskData = featureIndex >= 0 && 
                    featureIndex < subtasksQueries.length ? 
                    subtasksQueries[featureIndex]?.data || [] : [];
                  
                  const isLoading = featureIndex >= 0 && 
                    featureIndex < subtasksQueries.length ? 
                    subtasksQueries[featureIndex]?.isLoading || false : false;
                  
                  return (
                    <div key={feature.id} className="space-y-2">
                      <Card className="overflow-hidden border-2 border-primary/10">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-start gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 rounded-full"
                                onClick={() => toggleFeatureExpansion(feature.id)}
                              >
                                {isExpanded ? 
                                  <ChevronDown className="h-4 w-4" /> : 
                                  <ChevronRight className="h-4 w-4" />}
                              </Button>
                              <CardTitle className="text-base sm:text-lg">
                                <Link href={`/features/${feature.id}`} className="hover:underline">
                                  {feature.title}
                                </Link>
                              </CardTitle>
                            </div>
                            <Badge className={`text-xs ${getTaskStatusColor(feature.status)}`}>
                              {formatStatus(feature.status)}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs flex items-center gap-1 mt-1 ml-8">
                            <Clock className="h-3 w-3" />
                            <span>
                              {feature.estimatedTime 
                                ? `${feature.estimatedTime} hours estimated`
                                : "No time estimate"}
                            </span>
                          </CardDescription>
                        </CardHeader>
                        <Separator />
                        <CardContent className="p-4 pt-3">
                          <p className="text-xs sm:text-sm text-neutral-700 ml-8">
                            {feature.description || "No description provided."}
                          </p>
                          <div className="mt-3 flex justify-between items-center">
                            <div className="text-xs text-neutral-500 ml-8">
                              Priority: <span className="font-medium">{feature.priority}</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${feature.progress}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs">{feature.progress}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Subtasks section (conditional rendering) */}
                      {isExpanded && (
                        <div className="ml-6 pl-6 border-l-2 border-gray-200 space-y-2">
                          {isLoading ? (
                            <div className="animate-pulse space-y-3 py-2">
                              <div className="h-12 bg-gray-200 rounded"></div>
                              <div className="h-12 bg-gray-200 rounded"></div>
                            </div>
                          ) : subtaskData.length === 0 ? (
                            <Card className="border border-dashed">
                              <CardContent className="p-3 text-center">
                                <p className="text-xs text-muted-foreground">No subtasks for this feature</p>
                              </CardContent>
                            </Card>
                          ) : (
                            subtaskData.map(subtask => (
                              <Card key={subtask.id} className="overflow-hidden">
                                <CardHeader className="p-3 pb-1">
                                  <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-sm">
                                      <Link href={`/tasks/${subtask.id}`} className="hover:underline">
                                        {subtask.title}
                                      </Link>
                                    </CardTitle>
                                    <Badge className={`text-xs ${getTaskStatusColor(subtask.status)}`}>
                                      {formatStatus(subtask.status)}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <Separator />
                                <CardContent className="p-3 pt-2">
                                  <p className="text-xs text-neutral-700 line-clamp-2">
                                    {subtask.description || "No description provided."}
                                  </p>
                                  <div className="mt-2 flex justify-between items-center">
                                    <div className="text-xs text-neutral-500">
                                      Priority: <span className="font-medium">{subtask.priority}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-primary" 
                                          style={{ width: `${subtask.progress}%` }}
                                        ></div>
                                      </div>
                                      <span className="ml-1 text-xs">{subtask.progress}%</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        
        {/* Regular Tasks Section - Collapsible */}
        <Collapsible 
          open={openSections.tasks} 
          onOpenChange={() => toggleSection('tasks')}
          className="sm:col-span-2 lg:col-span-1 mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center">
              <ListChecks className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span>Tasks</span>
              <Badge className="ml-2 text-xs">{tasks.length}</Badge>
            </h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {openSections.tasks ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            {isLoadingTasks ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="p-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <Card className="text-center p-4">
                <CardContent>
                  <p className="text-muted-foreground text-xs sm:text-sm">No regular tasks in this project.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id} className="overflow-hidden">
                    <CardHeader className="p-3 pb-1">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-sm">
                          <Link href={`/tasks/${task.id}`} className="hover:underline">
                            {task.title}
                          </Link>
                        </CardTitle>
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
                    <CardContent className="p-3 pt-2">
                      <p className="text-xs text-neutral-700 line-clamp-2">
                        {task.description || "No description provided."}
                      </p>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="text-xs text-neutral-500">
                          Priority: <span className="font-medium">{task.priority}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                          <span className="ml-1 text-xs">{task.progress}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* GitHub Repository Section */}
            <div className="mt-6">
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center">
                  <Github className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span>GitHub Repository</span>
                </h2>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <GitHubRepoViewer 
                    projectId={projectId} 
                    repository={(project as any).githubRepo} 
                    branch={(project as any).githubBranch}
                  />
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      
      {/* Agent Communications - Collapsible */}
      <Collapsible 
        open={openSections.conversations} 
        onOpenChange={() => toggleSection('conversations')}
        className="mt-8"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center">
            <MessageCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            <span>Agent Communications</span>
            <Badge className="ml-2 text-xs">{conversations.length}</Badge>
          </h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {openSections.conversations ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
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
              {[...conversations].reverse().map((log) => (
                <Card key={log.id} className={`overflow-hidden border-l-4 ${log.agentId ? 'border-l-primary' : 'border-l-slate-400'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`p-2 rounded-full ${log.agentId ? 'bg-primary/10' : 'bg-slate-100'}`}>
                          {log.agentId ? (
                            <MessageSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <User className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {log.agentId ? (
                              <>
                                <span className="text-primary">Agent #{log.agentId}</span>
                                {log.type && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 font-normal">
                                    {log.type}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span>You</span>
                            )}
                            {log.targetAgentId && <span className="text-muted-foreground flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" /> 
                              <span>Agent #{log.targetAgentId}</span>
                            </span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-primary prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                          <p>{log.message}</p>
                        </div>
                        
                        {!log.agentId && (
                          <div className="mt-1 text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleReply(log.targetAgentId || 1, `Agent #${log.targetAgentId}`)}
                              className="text-xs h-7 gap-1"
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
            </div>
          )}
          
          <div className="mt-6">
            <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
              <div className="rounded-lg bg-muted p-2">
                {replyingTo && (
                  <div className="mb-2 flex items-center px-3 py-1 bg-background rounded text-xs text-muted-foreground">
                    <span>Replying to {replyingTo.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-auto p-0 text-muted-foreground"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Cancel reply</span>
                    </Button>
                  </div>
                )}
                <div className="relative">
                  <Input
                    placeholder={
                      replyingTo
                        ? `Reply to ${replyingTo.name}...`
                        : "Send a message to the project orchestrator..."
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="pr-10 bg-background"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    disabled={!message.trim()}
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}