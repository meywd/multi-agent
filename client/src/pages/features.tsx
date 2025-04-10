import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFeatures } from "@/lib/agentService";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  Filter, 
  Layers, 
  Search, 
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal
} from "lucide-react";

export default function FeaturesPage() {
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("priority");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Fetch all features
  const { 
    data: features = [], 
    isLoading 
  } = useQuery({
    queryKey: ["/api/features"],
    queryFn: () => getFeatures(),
  });
  
  // Get unique projects for filter dropdown
  const projects = Array.from(
    new Set(
      features
        .filter(feature => feature.projectId !== null)
        .map(feature => feature.projectId)
    )
  );

  // Filter features based on search term and filters
  const filteredFeatures = features.filter(feature => {
    const matchesSearch = 
      searchQuery === "" || 
      feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (feature.description && feature.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProject = 
      projectFilter === null || 
      feature.projectId === projectFilter;
    
    const matchesStatus = 
      statusFilter === null || 
      feature.status === statusFilter;
    
    return matchesSearch && matchesProject && matchesStatus;
  });
  
  // Sort features
  const sortedFeatures = [...filteredFeatures].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                    (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
        break;
      case "progress":
        comparison = (a.progress || 0) - (b.progress || 0);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      default:
        comparison = 0;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  // Handle status badge color
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
  
  // Get project name by projectId 
  // For a real implementation, you'd need to fetch project details
  const getProjectName = (projectId: number | null) => {
    // This is a placeholder. In a real app, you'd get the name from a projects query
    return projectId ? `Project #${projectId}` : "No Project";
  };
  
  // Handle sort change
  const handleSortChange = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="w-full">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Features</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all features across your projects</p>
        </div>
      </header>
      
      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search features..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div>
          <Select 
            onValueChange={(value) => setProjectFilter(value === "all" ? null : parseInt(value))}
            value={projectFilter === null ? "all" : projectFilter.toString()}
          >
            <SelectTrigger className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              <span>Project</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((projectId) => (
                <SelectItem key={projectId} value={projectId!.toString()}>
                  {getProjectName(projectId)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select 
            onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
            value={statusFilter === null ? "all" : statusFilter}
          >
            <SelectTrigger className="w-full">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <span>Status</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select 
            onValueChange={(value) => handleSortChange(value)}
            value={sortField}
          >
            <SelectTrigger className="w-full">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <span>Sort By</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Features List */}
      {isLoading ? (
        <div className="space-y-4">
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
      ) : sortedFeatures.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent>
            <p className="text-muted-foreground">No features found with the current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedFeatures.map((feature) => (
            <Card key={feature.id} className="overflow-hidden border-2 border-primary/10">
              <CardHeader className="p-4 pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-lg inline-flex items-center">
                      <Layers className="mr-2 h-4 w-4 flex-shrink-0" />
                      <Link href={`/features/${feature.id}`} className="hover:underline">
                        {feature.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <span className="text-xs font-medium">
                        {getProjectName(feature.projectId)}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(feature.status)}`}>
                    {formatStatus(feature.status)}
                  </Badge>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-4 pt-3">
                <p className="text-sm text-neutral-700 line-clamp-2">
                  {feature.description || "No description provided."}
                </p>
                <div className="mt-3 flex justify-between items-center">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      Priority: <span className="font-medium">{
                        feature.priority.charAt(0).toUpperCase() + feature.priority.slice(1)
                      }</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{feature.estimatedTime || 0} hours</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${feature.progress}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs">{feature.progress}%</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-4 py-2 bg-muted/20 flex justify-end">
                <Link href={`/features/${feature.id}`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1 h-7">
                    View Details
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}