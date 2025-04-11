import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Feature {
  id: number;
  title: string;
  description: string | null;
  status: string;
  projectId: number | null;
}

// Link feature schema
const linkFeatureSchema = z.object({
  featureId: z.string().min(1, "Please select a feature"),
});

interface LinkFeatureDialogProps {
  agentId: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function LinkFeatureDialog({ 
  agentId, 
  trigger, 
  onSuccess 
}: LinkFeatureDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof linkFeatureSchema>>({
    resolver: zodResolver(linkFeatureSchema),
    defaultValues: {
      featureId: "",
    },
  });

  // Fetch available features
  const { data: features = [], isLoading } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
    enabled: isOpen, // Only fetch when dialog is open
  });

  // Link feature mutation
  const linkFeatureMutation = useMutation({
    mutationFn: async (data: { featureId: number, agentId: number }) => {
      return apiRequest("PATCH", `/api/features/${data.featureId}/assign`, { 
        agentId: data.agentId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      
      toast({
        title: "Feature linked",
        description: "Feature has been successfully linked to the agent",
      });
      
      setIsOpen(false);
      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to link feature. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (values: z.infer<typeof linkFeatureSchema>) => {
    linkFeatureMutation.mutate({
      featureId: parseInt(values.featureId),
      agentId
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline">Link Feature</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Feature to Agent</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Assign an existing feature to this agent for implementation or management.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="featureId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Select Feature</FormLabel>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : features.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No available features found. Please create a feature first.
                    </div>
                  ) : (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a feature" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {features.map((feature) => (
                          <SelectItem key={feature.id} value={feature.id.toString()}>
                            {feature.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="submit" 
                size="sm" 
                className="text-xs sm:text-sm"
                disabled={isLoading || features.length === 0 || linkFeatureMutation.isPending}
              >
                {linkFeatureMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  "Link Feature"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}