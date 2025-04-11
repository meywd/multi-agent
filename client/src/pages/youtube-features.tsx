import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject, createFeature } from "@/lib/agentService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";

// YouTube features organized by category
const YOUTUBE_FEATURES = [
  // User Authentication & Profiles
  {
    category: "User Authentication & Profiles",
    features: [
      {
        title: "User Registration & Login",
        description: "Allow users to create accounts and sign in using email, Google, or other third-party providers",
        priority: "high",
        estimatedTime: 20
      },
      {
        title: "User Profile Management",
        description: "Enable users to customize their profiles with pictures, channel descriptions, and personal details",
        priority: "medium",
        estimatedTime: 15
      },
      {
        title: "Channel Creation & Customization",
        description: "Let users create and customize their own channels with banners, logos, and about sections",
        priority: "medium",
        estimatedTime: 18
      },
      {
        title: "Subscription Management",
        description: "Allow users to subscribe to channels and manage their subscriptions",
        priority: "high",
        estimatedTime: 12
      }
    ]
  },
  
  // Video Management
  {
    category: "Video Management",
    features: [
      {
        title: "Video Upload & Processing",
        description: "Allow users to upload videos in various formats with automatic transcoding and processing",
        priority: "high",
        estimatedTime: 25
      },
      {
        title: "Video Metadata Management",
        description: "Enable users to add titles, descriptions, tags, thumbnails, and categories to their videos",
        priority: "high",
        estimatedTime: 15
      },
      {
        title: "Video Editor",
        description: "Provide basic editing functionality for trimming, adding effects, and enhancing uploaded videos",
        priority: "medium",
        estimatedTime: 30
      },
      {
        title: "Thumbnail Generation",
        description: "Automatically generate thumbnails from video frames with options for custom uploads",
        priority: "medium",
        estimatedTime: 10
      },
      {
        title: "Video Analytics",
        description: "Provide creators with detailed analytics about video performance, audience demographics, and engagement",
        priority: "medium",
        estimatedTime: 20
      }
    ]
  },
  
  // Content Discovery & Recommendation
  {
    category: "Content Discovery & Recommendation",
    features: [
      {
        title: "Home Feed Algorithm",
        description: "Implement a recommendation system that suggests videos based on user preferences and viewing history",
        priority: "high",
        estimatedTime: 40
      },
      {
        title: "Search Functionality",
        description: "Robust search capability with filters for videos, channels, and playlists with auto-complete suggestions",
        priority: "high",
        estimatedTime: 25
      },
      {
        title: "Trending Videos",
        description: "Algorithm to highlight trending content based on views, engagement, and recency",
        priority: "medium",
        estimatedTime: 20
      },
      {
        title: "Categories & Tags",
        description: "Organize videos by categories and tags for easier discovery",
        priority: "medium",
        estimatedTime: 15
      },
      {
        title: "Watch History",
        description: "Track and display user's watch history with options to clear or pause tracking",
        priority: "medium",
        estimatedTime: 12
      }
    ]
  },
  
  // Video Playback
  {
    category: "Video Playback",
    features: [
      {
        title: "Video Player",
        description: "Custom video player with play/pause, volume control, speed settings, and full-screen mode",
        priority: "high",
        estimatedTime: 30
      },
      {
        title: "Resolution Selection",
        description: "Allow users to select different video resolutions based on their preference or bandwidth",
        priority: "medium",
        estimatedTime: 15
      },
      {
        title: "Autoplay Functionality",
        description: "Automatically play the next recommended video when the current one finishes",
        priority: "medium",
        estimatedTime: 10
      },
      {
        title: "Picture-in-Picture Mode",
        description: "Enable users to continue watching videos while browsing other content on the platform",
        priority: "low",
        estimatedTime: 12
      },
      {
        title: "Video Chapters",
        description: "Support for video chapters to help users navigate longer content",
        priority: "low",
        estimatedTime: 8
      }
    ]
  },
  
  // Social & Engagement
  {
    category: "Social & Engagement",
    features: [
      {
        title: "Comments System",
        description: "Allow users to comment on videos with threading, likes, and moderation tools",
        priority: "high",
        estimatedTime: 20
      },
      {
        title: "Like/Dislike Functionality",
        description: "Enable users to express sentiment about videos through like and dislike buttons",
        priority: "high",
        estimatedTime: 10
      },
      {
        title: "Sharing Tools",
        description: "Make it easy to share videos on social media or copy embeddable links",
        priority: "medium",
        estimatedTime: 12
      },
      {
        title: "Notifications",
        description: "Alert users about new uploads, comments, or activity related to their content",
        priority: "medium",
        estimatedTime: 18
      },
      {
        title: "Community Posts",
        description: "Allow creators to post text, images, and polls to engage with their audience outside of videos",
        priority: "low",
        estimatedTime: 15
      }
    ]
  },
  
  // Playlists & Content Organization
  {
    category: "Playlists & Content Organization",
    features: [
      {
        title: "Playlist Creation & Management",
        description: "Enable users to create, edit, and organize playlists of videos",
        priority: "medium",
        estimatedTime: 15
      },
      {
        title: "Watch Later Functionality",
        description: "Allow users to bookmark videos for later viewing",
        priority: "medium",
        estimatedTime: 8
      },
      {
        title: "Saved Videos Library",
        description: "Provide a library of saved videos with organization options",
        priority: "low",
        estimatedTime: 10
      },
      {
        title: "Collections Feature",
        description: "Group playlists into collections for better content organization",
        priority: "low",
        estimatedTime: 12
      }
    ]
  },
  
  // Monetization
  {
    category: "Monetization",
    features: [
      {
        title: "Advertising System",
        description: "Implement pre-roll, mid-roll, and post-roll ads with targeting options",
        priority: "medium",
        estimatedTime: 35
      },
      {
        title: "Creator Monetization",
        description: "Revenue sharing program for eligible creators",
        priority: "medium",
        estimatedTime: 25
      },
      {
        title: "Super Chat/Donations",
        description: "Allow viewers to make donations or highlight their messages in live streams",
        priority: "low",
        estimatedTime: 15
      },
      {
        title: "Channel Memberships",
        description: "Subscription tiers for channels with exclusive perks for members",
        priority: "low",
        estimatedTime: 20
      },
      {
        title: "Merchandise Integration",
        description: "Enable creators to showcase and sell merchandise through their channels",
        priority: "low",
        estimatedTime: 18
      }
    ]
  },
  
  // Live Streaming
  {
    category: "Live Streaming",
    features: [
      {
        title: "Live Broadcasting",
        description: "Allow users to stream live video content to their audience",
        priority: "medium",
        estimatedTime: 40
      },
      {
        title: "Live Chat",
        description: "Real-time chat functionality during live streams",
        priority: "medium",
        estimatedTime: 20
      },
      {
        title: "Stream Health Monitoring",
        description: "Tools to monitor stream quality and performance",
        priority: "low",
        estimatedTime: 15
      },
      {
        title: "Stream Scheduling",
        description: "Allow creators to schedule upcoming streams with notifications for subscribers",
        priority: "low",
        estimatedTime: 12
      }
    ]
  },
  
  // Internationalization & Accessibility
  {
    category: "Internationalization & Accessibility",
    features: [
      {
        title: "Multi-language Support",
        description: "Interface translations and localization for global audience",
        priority: "medium",
        estimatedTime: 25
      },
      {
        title: "Subtitles & Closed Captions",
        description: "Support for captions with auto-generation and customization options",
        priority: "medium",
        estimatedTime: 20
      },
      {
        title: "Screen Reader Compatibility",
        description: "Ensure accessibility for users with screen readers and other assistive technologies",
        priority: "medium",
        estimatedTime: 15
      },
      {
        title: "Keyboard Navigation",
        description: "Complete keyboard control for users who cannot use a mouse",
        priority: "low",
        estimatedTime: 10
      }
    ]
  },
  
  // Administration & Moderation
  {
    category: "Administration & Moderation",
    features: [
      {
        title: "Content Moderation Tools",
        description: "Systems to review and moderate user-generated content",
        priority: "high",
        estimatedTime: 30
      },
      {
        title: "Copyright Claim System",
        description: "Allow copyright owners to claim content and manage usage rights",
        priority: "medium",
        estimatedTime: 35
      },
      {
        title: "Community Guidelines Enforcement",
        description: "Systems to enforce platform rules and handle violations",
        priority: "medium",
        estimatedTime: 20
      },
      {
        title: "Dashboard & Analytics",
        description: "Admin dashboard with platform statistics and user analytics",
        priority: "medium",
        estimatedTime: 25
      }
    ]
  }
];

export default function YouTubeFeatures() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id as string);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addingFeatures, setAddingFeatures] = useState<{ [key: string]: boolean }>({});

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: () => getProject(projectId),
    enabled: !isNaN(projectId)
  });

  // Mutation for creating features
  const createFeatureMutation = useMutation({
    mutationFn: (featureData: any) => createFeature({
      ...featureData,
      projectId,
      status: "todo",
      isFeature: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
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
      
      toast({
        title: "Feature Added",
        description: `"${feature.title}" has been added to your project.`,
      });
    } catch (error) {
      // Error is handled in the mutation's onError
    } finally {
      setAddingFeatures(prev => ({ ...prev, [feature.title]: false }));
    }
  };

  const handleGoToFeatures = () => {
    setLocation("/features");
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
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">YouTube Features</h1>
          <p className="text-muted-foreground">
            Add features from this template to your "{project.name}" project
          </p>
        </div>
        <Button onClick={handleGoToFeatures}>Go to Features</Button>
      </div>

      <div className="grid gap-6">
        {YOUTUBE_FEATURES.map((category) => (
          <Card key={category.category} className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle>{category.category}</CardTitle>
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
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
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
                          <Check className="h-4 w-4 mr-1" />
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