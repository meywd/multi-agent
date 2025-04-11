import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTaskSchema } from "@shared/schema";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Feature schema extends the task schema with required fields for features
const featureSchema = insertTaskSchema.extend({
  title: z.string().min(3, "Feature title must be at least 3 characters"),
  description: z.string().min(10, "Feature description must be at least 10 characters"),
  projectId: z.number().nullish(),
  priority: z.string(),
  assignedTo: z.number().nullish(), // Use assignedTo for agent ID
});

interface CreateFeatureDialogProps {
  projectId?: number;
  agentId?: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CreateFeatureDialog({ 
  projectId, 
  agentId, 
  trigger, 
  onSuccess
}: CreateFeatureDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof featureSchema>>({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      projectId: projectId,
      agentId: agentId,
      isFeature: true,
    },
  });

  const handleSubmit = async (values: z.infer<typeof featureSchema>) => {
    try {
      await apiRequest("POST", "/api/features", values);

      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      }

      toast({
        title: "Feature created",
        description: "Your new feature has been created successfully",
      });
      
      setIsOpen(false);
      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create feature. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm">Create Feature</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Feature</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Add a new feature to the project. Features can have sub-tasks and can be assigned to agents.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Feature Title</FormLabel>
                  <FormControl>
                    <Input placeholder="New Feature Name" {...field} className="text-xs sm:text-sm" />
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
                      placeholder="Describe the feature in detail..." 
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
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Priority</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" size="sm" className="text-xs sm:text-sm">Create Feature</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}