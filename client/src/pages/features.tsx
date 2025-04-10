import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFeatures } from "@/lib/agentService";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Clock, Filter } from "lucide-react";
import { Link } from "wouter";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { getProjects } from "@/lib/agentService";

export default function FeaturesPage() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  
  // Query all features
  const { data: features = [], isLoading: isLoadingFeatures } = useQuery({
    queryKey: ["/api/features"],
    queryFn: () => getFeatures(),
  });
  
  // Query all projects for filtering
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: getProjects,
  });
  
  // Filter features by project if a project is selected
  const filteredFeatures = selectedProject === "all" 
    ? features 
    : features.filter(feature => feature.projectId === parseInt(selectedProject));
    
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

  const formatStatus = (status: string) => {
    return status === "in_progress" 
      ? "In Progress" 
      : status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  return (
    <div className="w-full px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Features</h1>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedProject}
            onValueChange={setSelectedProject}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoadingFeatures ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
      ) : filteredFeatures.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent>
            <p className="text-muted-foreground">
              {selectedProject === "all" 
                ? "No features found in any project." 
                : "No features found for the selected project."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFeatures.map((feature) => (
            <Card key={feature.id} className="overflow-hidden border-2 border-primary/10">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base sm:text-lg">
                    <Link href={`/features/${feature.id}`} className="hover:underline flex items-center">
                      {feature.title}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </CardTitle>
                  <Badge className={`text-xs ${getStatusColor(feature.status)}`}>
                    {formatStatus(feature.status)}
                  </Badge>
                </div>
                <div className="text-xs flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {feature.estimatedTime 
                      ? `${feature.estimatedTime} hours estimated`
                      : "No time estimate"}
                  </span>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-4 pt-3">
                <p className="text-xs sm:text-sm text-neutral-700 line-clamp-2">
                  {feature.description || "No description provided."}
                </p>
                <div className="mt-3 flex justify-between items-center">
                  <div className="text-xs text-neutral-500">
                    {projects.find(p => p.id === feature.projectId)?.name || "No project"}
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
          ))}
        </div>
      )}
    </div>
  );
}