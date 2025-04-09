import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github } from "lucide-react";

interface GitHubLinkFormProps {
  projectId: number;
  existingRepo?: string;
  existingBranch?: string;
  onSuccess?: () => void;
}

export function GitHubLinkForm({ 
  projectId, 
  existingRepo, 
  existingBranch = "main",
  onSuccess 
}: GitHubLinkFormProps) {
  const [open, setOpen] = useState(false);
  const [repository, setRepository] = useState(existingRepo || "");
  const [branch, setBranch] = useState(existingBranch || "main");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const linkMutation = useMutation<any, Error, { repository: string; branch: string }>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/github`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "GitHub repository linked successfully",
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to link GitHub repository: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!repository) {
      toast({
        title: "Error",
        description: "Repository name is required",
        variant: "destructive",
      });
      return;
    }
    
    // Validate repository format (owner/repo)
    if (!repository.includes('/')) {
      toast({
        title: "Error",
        description: "Repository format should be owner/repository",
        variant: "destructive",
      });
      return;
    }
    
    linkMutation.mutate({ repository, branch });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={existingRepo ? "outline" : "default"} className="gap-2">
          <Github size={18} />
          {existingRepo ? "Change Repository" : "Link GitHub Repository"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingRepo ? "Update" : "Link"} GitHub Repository</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="repository">Repository (owner/repository)</Label>
            <Input
              id="repository"
              placeholder="e.g. octocat/Hello-World"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Input
              id="branch"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>
          
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={linkMutation.isPending}
            >
              {linkMutation.isPending ? "Linking..." : "Link Repository"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}