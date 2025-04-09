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
  Clock, 
  Calendar, 
  MessageSquare, 
  User, 
  Send, 
  Reply,
  ChevronRight,
  ChevronDown,
  Layers
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Features Section */}
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center">
              <Layers className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span>Features</span>
              <Badge className="ml-2 text-xs">{features.length}</Badge>
            </h2>
          </div>

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
        </div>
        
        {/* Regular Tasks Section */}
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center">
              <span>Tasks</span>
              <Badge className="ml-2 text-xs">{tasks.length}</Badge>
            </h2>
          </div>

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
        </div>
      </div>
      
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
                      {(() => {
                        const lines = log.message.split('\n');
                        const result = [];
                        let inUnorderedList = false;
                        let inOrderedList = false;
                        let listItems = [];
                        let listCounter = 0;

                        for (let i = 0; i < lines.length; i++) {
                          const line = lines[i];
                          
                          // Check if line is a heading
                          if (line.startsWith('# ')) {
                            // Close any open lists before adding a heading
                            if (inUnorderedList) {
                              result.push(<ul key={`ul-${i}`} className="list-disc pl-4">{listItems}</ul>);
                              listItems = [];
                              inUnorderedList = false;
                            } else if (inOrderedList) {
                              result.push(<ol key={`ol-${i}`} className="list-decimal pl-4">{listItems}</ol>);
                              listItems = [];
                              inOrderedList = false;
                            }
                            result.push(<h1 key={`h1-${i}`}>{line.substring(2)}</h1>);
                          } else if (line.startsWith('## ')) {
                            // Close any open lists before adding a heading
                            if (inUnorderedList) {
                              result.push(<ul key={`ul-${i}`} className="list-disc pl-4">{listItems}</ul>);
                              listItems = [];
                              inUnorderedList = false;
                            } else if (inOrderedList) {
                              result.push(<ol key={`ol-${i}`} className="list-decimal pl-4">{listItems}</ol>);
                              listItems = [];
                              inOrderedList = false;
                            }
                            result.push(<h2 key={`h2-${i}`}>{line.substring(3)}</h2>);
                          } else if (line.startsWith('### ')) {
                            // Close any open lists before adding a heading
                            if (inUnorderedList) {
                              result.push(<ul key={`ul-${i}`} className="list-disc pl-4">{listItems}</ul>);
                              listItems = [];
                              inUnorderedList = false;
                            } else if (inOrderedList) {
                              result.push(<ol key={`ol-${i}`} className="list-decimal pl-4">{listItems}</ol>);
                              listItems = [];
                              inOrderedList = false;
                            }
                            result.push(<h3 key={`h3-${i}`}>{line.substring(4)}</h3>);
                          } 
                          // Check if line starts a list item (-)
                          else if (line.startsWith('- ')) {
                            // If we were in an ordered list, close it
                            if (inOrderedList) {
                              result.push(<ol key={`ol-${i}`} className="list-decimal pl-4">{listItems}</ol>);
                              listItems = [];
                              inOrderedList = false;
                            }
                            // Start or continue an unordered list
                            inUnorderedList = true;
                            listItems.push(<li key={`li-${i}`}>{line.substring(2)}</li>);
                          }
                          // Check if line starts a numbered list (1., 2., etc)
                          else if (/^\d+\.\s/.test(line)) {
                            // If we were in an unordered list, close it
                            if (inUnorderedList) {
                              result.push(<ul key={`ul-${i}`} className="list-disc pl-4">{listItems}</ul>);
                              listItems = [];
                              inUnorderedList = false;
                            }
                            // Start or continue an ordered list
                            inOrderedList = true;
                            const content = line.substring(line.indexOf('.') + 2);
                            listItems.push(<li key={`li-${i}`}>{content}</li>);
                          }
                          // If line is empty and we're in a list, close the list
                          else if (line.trim() === '' && (inUnorderedList || inOrderedList)) {
                            if (inUnorderedList) {
                              result.push(<ul key={`ul-${i}`} className="list-disc pl-4">{listItems}</ul>);
                              listItems = [];
                              inUnorderedList = false;
                            } else if (inOrderedList) {
                              result.push(<ol key={`ol-${i}`} className="list-decimal pl-4">{listItems}</ol>);
                              listItems = [];
                              inOrderedList = false;
                            }
                            result.push(<br key={`br-${i}`} />);
                          }
                          // Check if line is bold (starts with ** and ends with **)
                          else if (line.startsWith('**') && line.endsWith('**')) {
                            // Close any open lists before adding a bold line
                            if (inUnorderedList) {
                              result.push(<ul key={`ul-${i}`} className="list-disc pl-4">{listItems}</ul>);
                              listItems = [];
                              inUnorderedList = false;
                            } else if (inOrderedList) {
                              result.push(<ol key={`ol-${i}`} className="list-decimal pl-4">{listItems}</ol>);
                              listItems = [];
                              inOrderedList = false;
                            }
                            result.push(<p key={`p-${i}`}><strong>{line.substring(2, line.length - 2)}</strong></p>);
                          }
                          // Empty line outside of a list
                          else if (line.trim() === '') {
                            result.push(<br key={`br-${i}`} />);
                          }
                          // Default case: regular paragraph
                          else {
                            // Close any open lists before adding a paragraph
                            if (inUnorderedList) {
                              result.push(<ul key={`ul-${i}`} className="list-disc pl-4">{listItems}</ul>);
                              listItems = [];
                              inUnorderedList = false;
                            } else if (inOrderedList) {
                              result.push(<ol key={`ol-${i}`} className="list-decimal pl-4">{listItems}</ol>);
                              listItems = [];
                              inOrderedList = false;
                            }
                            result.push(<p key={`p-${i}`}>{line}</p>);
                          }
                        }

                        // Close any open lists at the end
                        if (inUnorderedList) {
                          result.push(<ul key="ul-end" className="list-disc pl-4">{listItems}</ul>);
                        } else if (inOrderedList) {
                          result.push(<ol key="ol-end" className="list-decimal pl-4">{listItems}</ol>);
                        }

                        return result;
                      })()}
                    </div>
                    {log.details && (
                      <div className="mt-3 bg-slate-50 border border-slate-200 p-3 rounded-md text-sm font-mono whitespace-pre-wrap overflow-x-auto text-slate-800">
                        {log.details.split('\n').map((line, i) => {
                          // Check if this is a code block boundary with ```
                          if (line.trim() === '```' || line.match(/^```\w+$/)) {
                            return null; // Skip the code fence markers
                          }
                          // Add syntax highlighting class if inside a code block
                          if (line.startsWith('    ') || line.startsWith('\t')) {
                            return (
                              <div key={i} className="px-2 py-0.5 bg-slate-100 border-l-2 border-primary">
                                {line}
                              </div>
                            );
                          }
                          return <div key={i}>{line || ' '}</div>;
                        })}
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