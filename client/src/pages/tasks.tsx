import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTasks, getAgents, getProjects } from "@/lib/agentService";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertTaskSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ClockIcon, CheckCircle2, AlertCircle, ListFilter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, Agent, Project } from "@/lib/types";

const taskSchema = insertTaskSchema.extend({
  title: z.string().min(3, "Task title must be at least 3 characters long"),
  description: z.string().min(10, "Task description must be at least 10 characters long").optional(),
  estimatedTime: z.coerce.number().min(0).optional(),
  projectId: z.number({ 
    required_error: "Please select a project" 
  }),
});

export default function TasksPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assignedTo: undefined,
      estimatedTime: undefined,
      projectId: undefined,
    },
  });

  // Only get tasks with projectId
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    select: (data) => data.filter((task) => task.projectId !== null),
  });

  const { data: agents = [], isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const filteredTasks = tasks.filter((task: Task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const handleSubmit = async (values: z.infer<typeof taskSchema>) => {
    try {
      await apiRequest({
        method: "POST",
        url: "/api/tasks",
        body: values,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task created",
        description: "Your new task has been created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
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

  if (isLoadingTasks) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  const getAgentName = (agentId?: number) => {
    if (!agentId) return "Unassigned";
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : "Unknown";
  };

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Tasks</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Add a new task to the system. Define its details and assign it to an agent.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Implement login page" {...field} className="text-xs sm:text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the task in detail..." 
                          {...field} 
                          className="h-24 text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Status</FormLabel>
                        <FormControl>
                          <select 
                            className="w-full p-2 border rounded-md text-xs sm:text-sm" 
                            {...field}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Priority</FormLabel>
                        <FormControl>
                          <select 
                            className="w-full p-2 border rounded-md text-xs sm:text-sm" 
                            {...field}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Project</FormLabel>
                      <FormControl>
                        <select 
                          className="w-full p-2 border rounded-md text-xs sm:text-sm" 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        >
                          <option value="">Select a project</option>
                          {projects.map(project => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Assign To</FormLabel>
                        <FormControl>
                          <select 
                            className="w-full p-2 border rounded-md text-xs sm:text-sm" 
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          >
                            <option value="">Unassigned</option>
                            {agents.map(agent => (
                              <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Est. Time (Hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.5" 
                            placeholder="E.g., 2.5" 
                            {...field} 
                            className="text-xs sm:text-sm" 
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" size="sm" className="text-xs sm:text-sm">Create Task</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <CardTitle className="text-sm sm:text-base">Filter Tasks</CardTitle>
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[120px] text-xs sm:text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full sm:w-[120px] text-xs sm:text-sm">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {tasks.length === 0 ? (
        <Card className="w-full text-center py-8 sm:py-12">
          <CardContent>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4">No tasks found. Create your first task to get started.</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs sm:text-sm">Create Your First Task</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="w-full text-center py-6 sm:py-8">
          <CardContent>
            <p className="text-muted-foreground text-xs sm:text-sm">No tasks match your current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Title</TableHead>
                <TableHead className="w-[100px] text-center">Status</TableHead>
                <TableHead className="w-[100px] text-center">Priority</TableHead>
                <TableHead className="w-[120px] text-center">Assigned To</TableHead>
                <TableHead className="w-[100px] text-center">Progress</TableHead>
                <TableHead className="w-[100px] text-center">Est. Time</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task: Task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${getStatusColor(task.status)}`}>
                      {formatStatus(task.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${getPriorityColor(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs sm:text-sm">
                    {getAgentName(task.assignedTo)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs">{task.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {task.estimatedTime ? `${task.estimatedTime}h` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile view for tasks - only shown on small screens */}
      {tasks.length > 0 && filteredTasks.length > 0 && (
        <div className="md:hidden grid grid-cols-1 gap-3 sm:gap-4">
          {filteredTasks.map((task: Task) => (
            <Card key={task.id} className="overflow-hidden">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-sm sm:text-base">{task.title}</CardTitle>
                  <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                    {formatStatus(task.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Badge>
                  <CardDescription className="text-xs flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    <span>
                      {task.estimatedTime 
                        ? `${task.estimatedTime} hours estimated`
                        : "No time estimate"}
                    </span>
                  </CardDescription>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-3 sm:p-4 pt-2 sm:pt-3">
                <p className="text-xs sm:text-sm text-neutral-700 line-clamp-2 mb-2">
                  {task.description || "No description provided."}
                </p>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-neutral-500">
                    Assigned to: <span className="font-medium">{getAgentName(task.assignedTo)}</span>
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
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Issue
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}