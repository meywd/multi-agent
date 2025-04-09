import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Folder, File, ChevronLeft, RefreshCw } from "lucide-react";
import { GitHubLinkForm } from "./GitHubLinkForm";

interface GitHubRepoViewerProps {
  projectId: number;
  repository?: string;
  branch?: string;
}

interface FileContent {
  name: string;
  path: string;
  type: string;
  content?: string;
  download_url?: string;
  sha?: string;
  _links?: {
    git?: string;
    self?: string;
    html?: string;
  };
}

export function GitHubRepoViewer({ projectId, repository, branch = "main" }: GitHubRepoViewerProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [currentFileSha, setCurrentFileSha] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query to fetch repository contents
  const { data, isLoading, isError, error, refetch } = useQuery<FileContent | FileContent[]>({
    queryKey: [`/api/projects/${projectId}/github/content`, currentPath],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentPath) params.append('path', currentPath);
      const res = await fetch(`/api/projects/${projectId}/github/content?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch repository content: ${res.statusText}`);
      return await res.json();
    },
    enabled: !!repository,
  });
  
  // Mutation to save file changes
  const commitMutation = useMutation<any, Error, {
    path: string;
    content: string;
    message: string;
    sha?: string;
  }>({
    mutationFn: async ({
      path,
      content,
      message,
      sha,
    }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/github/commit`, {
        path,
        content,
        message,
        sha,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File committed successfully",
      });
      setIsEditing(false);
      setCommitMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/github/content`, currentPath] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to commit file: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle item click (file or folder)
  const handleItemClick = (item: FileContent) => {
    if (item.type === "dir") {
      setCurrentPath(item.path);
    } else if (item.type === "file") {
      // For files, we're already at the right path, content is already in 'data'
      if (item.content) {
        try {
          // GitHub API returns content as base64, we need to decode it
          const decodedContent = atob(item.content);
          setFileContent(decodedContent);
          setCurrentFileSha(item.sha || "");
        } catch (e) {
          setFileContent(item.content); // If it's not base64 for some reason
        }
      } else {
        setFileContent("");
      }
    }
  };
  
  // Go back to parent directory
  const handleGoBack = () => {
    if (currentPath) {
      const pathParts = currentPath.split('/');
      pathParts.pop();
      setCurrentPath(pathParts.join('/'));
    }
  };
  
  // Handle save button click
  const handleSaveFile = () => {
    if (Array.isArray(data)) return; // Can't save a directory
    
    if (!commitMessage) {
      toast({
        title: "Error",
        description: "Please provide a commit message",
        variant: "destructive",
      });
      return;
    }
    
    commitMutation.mutate({
      path: currentPath,
      content: fileContent,
      message: commitMessage,
      sha: currentFileSha,
    });
  };
  
  // Set file content when data changes
  useEffect(() => {
    if (data && !Array.isArray(data) && data.content) {
      try {
        const decodedContent = atob(data.content);
        setFileContent(decodedContent);
        setCurrentFileSha(data.sha || "");
      } catch (e) {
        setFileContent(data.content || "");
      }
    }
  }, [data]);
  
  // Display loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-border mb-4" />
        <p className="text-gray-500">Loading repository content...</p>
      </div>
    );
  }
  
  // Display error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">Failed to load repository content</p>
        <p className="text-gray-500 mb-4">{(error as Error).message}</p>
        {repository ? (
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        ) : (
          <GitHubLinkForm projectId={projectId} />
        )}
      </div>
    );
  }
  
  // If no repository is linked
  if (!repository) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 mb-4">No GitHub repository linked to this project</p>
        <GitHubLinkForm projectId={projectId} />
      </div>
    );
  }

  // Display repository content
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGoBack} 
            disabled={!currentPath}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <span className="text-sm text-gray-500">
            {repository}:{branch}/{currentPath}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <GitHubLinkForm 
            projectId={projectId} 
            existingRepo={repository} 
            existingBranch={branch} 
          />
        </div>
      </div>

      {/* Show directory listing */}
      {data && Array.isArray(data) && (
        <div className="border rounded-md overflow-hidden">
          <div className="divide-y">
            {data.map((item) => (
              <div
                key={item.path}
                className="flex items-center px-4 py-2 hover:bg-secondary cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                {item.type === "dir" ? (
                  <Folder className="h-5 w-5 mr-2 text-blue-500" />
                ) : (
                  <File className="h-5 w-5 mr-2 text-gray-500" />
                )}
                <span>{item.name}</span>
              </div>
            ))}
            
            {data.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                This directory is empty
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show file content */}
      {data && !Array.isArray(data) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{data.name}</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancel Edit" : "Edit File"}
              </Button>
              
              {isEditing && (
                <Button
                  size="sm"
                  onClick={handleSaveFile}
                  disabled={commitMutation.isPending}
                  className="gap-1"
                >
                  {commitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Commit Changes
                </Button>
              )}
            </div>
          </div>
          
          <Separator />
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fileContent">File Content</Label>
                <Textarea
                  id="fileContent"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="font-mono h-64"
                />
              </div>
              
              <div>
                <Label htmlFor="commitMessage">Commit Message</Label>
                <Input
                  id="commitMessage"
                  placeholder="Update file content"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <pre className="p-4 bg-secondary rounded-md overflow-auto h-64 text-sm font-mono">
              {fileContent}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}