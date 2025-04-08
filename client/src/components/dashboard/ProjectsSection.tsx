import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjects, createProject } from "@/lib/agentService";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { Project } from "@/lib/types";

export default function ProjectsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "planning"
  });

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({ 
    queryKey: ['/api/projects'],
    staleTime: 30000 // 30 seconds
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      // Invalidate projects query to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Reset form and hide it
      setNewProject({
        name: "",
        description: "",
        status: "planning"
      });
      setShowNewProjectForm(false);
      
      // Show success toast
      toast({
        title: "Project created",
        description: "The project has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create project: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle project form submission
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name) {
      toast({
        title: "Validation Error",
        description: "Project name is required.",
        variant: "destructive",
      });
      return;
    }
    
    createProjectMutation.mutate(newProject);
  };

  // Get status badge color
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg sm:text-xl font-semibold text-neutral-800">Projects</h2>
        <Button 
          onClick={() => setShowNewProjectForm(!showNewProjectForm)}
          size="sm"
          className="text-xs sm:text-sm"
        >
          {showNewProjectForm ? "Cancel" : "New Project"}
        </Button>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <Card className="border border-blue-200 bg-blue-50">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg">Create New Project</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 sm:h-8 sm:w-8 p-0" 
                onClick={() => setShowNewProjectForm(false)}
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <form onSubmit={handleCreateProject} className="space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="name" className="text-xs sm:text-sm">Name</Label>
                <Input 
                  id="name" 
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  placeholder="Project name"
                  required
                  className="text-xs sm:text-sm"
                />
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
                <Textarea 
                  id="description" 
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  placeholder="Project description"
                  rows={3}
                  className="text-xs sm:text-sm"
                />
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="status" className="text-xs sm:text-sm">Status</Label>
                <Select 
                  value={newProject.status}
                  onValueChange={(value) => setNewProject({...newProject, status: value})}
                >
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="text-xs sm:text-sm">
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-2 text-xs sm:text-sm"
                disabled={createProjectMutation.isPending}
                size="sm"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      {isLoading ? (
        <div className="text-center py-6 sm:py-8 text-xs sm:text-sm">Loading projects...</div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {projects.map((project: Project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <CardTitle className="text-base sm:text-lg">{project.name}</CardTitle>
                  <Badge className={`text-xs font-normal ${getStatusColor(project.status)}`}>
                    {project.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <p className="text-neutral-600 text-xs sm:text-sm line-clamp-3">
                  {project.description || "No description provided."}
                </p>
              </CardContent>
              <CardFooter className="p-3 sm:p-4 pt-0 flex flex-col items-start gap-1 sm:gap-2">
                <div className="text-xs text-neutral-500">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </div>
                {project.completedAt && (
                  <div className="text-xs text-neutral-500">
                    Completed: {new Date(project.completedAt).toLocaleDateString()}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-2 text-xs sm:text-sm">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 sm:py-8 text-neutral-600 text-xs sm:text-sm">
          No projects found. Create your first project!
        </div>
      )}
    </div>
  );
}