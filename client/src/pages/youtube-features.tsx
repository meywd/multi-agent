import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject, createFeature } from "@/lib/agentService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowLeft, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation, Link } from "wouter";

// Essential YouTube features (simplified for faster implementation)
const YOUTUBE_FEATURES = [
  {
    category: "Core Features",
    features: [
      {
        title: "Video Playback",
        description: "Core video player with controls for play, pause, seek, and fullscreen",
        priority: "high",
        estimatedTime: 20
      },
      {
        title: "User Authentication",
        description: "User registration and login system with profile management",
        priority: "high",
        estimatedTime: 15
      },
      {
        title: "Video Upload",
        description: "Allow users to upload videos with title, description, and tags",
        priority: "high",
        estimatedTime: 25
      },
      {
        title: "Channel Management",
        description: "Enable users to create and customize their channels",
        priority: "medium",
        estimatedTime: 18
      }
    ]
  },
  {
    category: "Engagement Features",
    features: [
      {
        title: "Comments System",
        description: "Allow users to comment on videos with threading and likes",
        priority: "high",
        estimatedTime: 15
      },
      {
        title: "Like/Dislike Functionality",
        description: "Enable users to express sentiment about videos",
        priority: "medium",
        estimatedTime: 8
      },
      {
        title: "Video Recommendations",
        description: "Basic recommendation system for related videos",
        priority: "medium",
        estimatedTime: 20
      },
      {
        title: "Playlists",
        description: "Allow users to create and manage playlists",
        priority: "medium",
        estimatedTime: 12
      }
    ]
  },
  {
    category: "Discovery Features",
    features: [
      {
        title: "Search Functionality",
        description: "Video and channel search capability with filters",
        priority: "high",
        estimatedTime: 18
      },
      {
        title: "Categories",
        description: "Organize videos by categories for easier discovery",
        priority: "medium",
        estimatedTime: 10
      },
      {
        title: "Trending Videos",
        description: "Highlight popular content based on views and engagement",
        priority: "medium",
        estimatedTime: 12
      },
      {
        title: "Subscription Feed",
        description: "Display videos from channels users have subscribed to",
        priority: "medium",
        estimatedTime: 15
      }
    ]
  }
];

export default function YouTubeFeatures() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const projectId = id ? parseInt(id) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addingFeatures, setAddingFeatures] = useState<{ [key: string]: boolean }>({});

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId && !isNaN(projectId)
  });

  // Mutation for creating features
  const createFeatureMutation = useMutation({
    mutationFn: (featureData: any) => createFeature({
      ...featureData,
      projectId: projectId!,
      status: "todo",
      isFeature: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      queryClient.invalidateQueries({ queryKey: [`/api/features`, projectId] });
      
      toast({
        title: "Success",
        description: "Feature was added to your project",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create feature: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddFeature = async (feature: any) => {
    setAddingFeatures(prev => ({ ...prev, [feature.title]: true }));
    
    try {
      await createFeatureMutation.mutateAsync({
        title: feature.title,
        description: feature.description,
        priority: feature.priority,
        estimatedTime: feature.estimatedTime,
      });
    } catch (error) {
      // Error is handled in the mutation's onError
    } finally {
      setAddingFeatures(prev => ({ ...prev, [feature.title]: false }));
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <h1 className="text-2xl font-bold">Project Not Found</h1>
        <p className="text-muted-foreground">The project you're looking for doesn't exist.</p>
        <Button onClick={() => setLocation("/projects")}>Back to Projects</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
        </Link>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">YouTube Features Template</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add pre-defined YouTube features to your "{project.name}" project
            </p>
          </div>
          <Link href="/features">
            <Button size="sm">View All Features</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6">
        {YOUTUBE_FEATURES.map((category) => (
          <Card key={category.category} className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">{category.category}</CardTitle>
              <CardDescription>
                {category.features.length} features in this category
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {category.features.map((feature) => (
                  <div key={feature.title} className="p-4 flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                      <div className="flex gap-3 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          feature.priority === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : feature.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {feature.priority} priority
                        </span>
                        <span className="text-xs px-2 py-1 bg-muted rounded-full">
                          ~{feature.estimatedTime} hours
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddFeature(feature)}
                      disabled={addingFeatures[feature.title]}
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      {addingFeatures[feature.title] ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Feature
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => 
                  category.features.forEach(feature => handleAddFeature(feature))
                }
                disabled={Object.values(addingFeatures).some(v => v)}
              >
                Add all features in this category
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}