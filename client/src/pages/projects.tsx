import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertProjectSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Project } from "@/lib/types";
import { Link } from "wouter";

const projectSchema = insertProjectSchema.extend({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().min(10, "Project description must be at least 10 characters"),
});

export default function ProjectsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
    },
  });

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const handleSubmit = async (values: z.infer<typeof projectSchema>) => {
    try {
      await apiRequest({
        method: "POST",
        url: "/api/projects",
        body: values,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project created",
        description: "Your new project has been created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Projects</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Add a new project for your agents to work on. This will create a new project and allow you to assign tasks to it.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., E-commerce Website" {...field} className="text-xs sm:text-sm" />
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
                          placeholder="Describe the project objectives and scope..." 
                          {...field} 
                          className="h-24 text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
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
                          <option value="planning">Planning</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" size="sm" className="text-xs sm:text-sm">Create Project</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="w-full text-center py-8 sm:py-12">
          <CardContent>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4">No projects found. Create your first project to get started.</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs sm:text-sm">Create Your First Project</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <CardTitle className="text-base sm:text-lg md:text-xl">{project.name}</CardTitle>
                  <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                    {project.status === "in_progress" ? "In Progress" : 
                     project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </Badge>
                </div>
                <CardDescription className="text-xs sm:text-sm text-gray-500">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-3 sm:pt-4 p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-700 line-clamp-3">{project.description}</p>
                <div className="mt-3 sm:mt-4 flex justify-end">
                  <Link href={`/projects/${project.id}`}>
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}