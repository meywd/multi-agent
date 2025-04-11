import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAgents } from "@/lib/agentService";
import { queryAgent } from "@/lib/aiService";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Agent } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertAgentSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreateFeatureDialog } from "@/components/dialogs/CreateFeatureDialog";
import { LinkFeatureDialog } from "@/components/dialogs/LinkFeatureDialog";

const agentSchema = insertAgentSchema.extend({
  name: z.string().min(2, "Agent name must be at least 2 characters"),
  description: z.string().min(10, "Agent description must be at least 10 characters").optional(),
});

// Message schema for agent communication
const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
};

export default function AgentsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);

  const form = useForm<z.infer<typeof agentSchema>>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      description: "",
      role: "assistant",
      status: "offline",
    },
  });
  
  const chatForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });
  
  // Query agent mutation
  const agentQueryMutation = useMutation({
    mutationFn: (data: { agentId: number, query: string }) => {
      return queryAgent({
        agentId: data.agentId,
        prompt: data.query
      });
    },
    onSuccess: (data) => {
      // Add agent response to messages
      if (selectedAgent) {
        const newMessage: Message = {
          id: `agent-${Date.now()}`,
          content: data,
          sender: 'agent',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
      }
      setIsLoadingResponse(false);
    },
    onError: (error) => {
      console.error("Error querying agent:", error);
      toast({
        title: "Communication Error",
        description: "Failed to get a response from the agent. Please try again.",
        variant: "destructive",
      });
      setIsLoadingResponse(false);
    }
  });

  const handleSubmit = async (values: z.infer<typeof agentSchema>) => {
    try {
      await apiRequest({
        method: "POST",
        url: "/api/agents",
        body: values,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent created",
        description: "Your new agent has been created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle chat message submission
  const handleChatSubmit = async (values: z.infer<typeof messageSchema>) => {
    if (!selectedAgent) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: values.message,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    chatForm.reset();
    
    // Show loading indicator
    setIsLoadingResponse(true);
    
    // Send message to agent
    agentQueryMutation.mutate({
      agentId: selectedAgent.id, 
      query: values.message
    });
  };
  
  // Handle opening the chat dialog
  const handleOpenChat = (agent: Agent) => {
    setSelectedAgent(agent);
    setMessages([]);
    setIsChatOpen(true);
    
    // Add initial welcome message from agent
    const welcomeMessage: Message = {
      id: `agent-welcome-${Date.now()}`,
      content: `Hello, I'm ${agent.name}, your ${agent.role} agent. How can I assist you today?`,
      sender: 'agent',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };
  
  // Handle closing the chat dialog
  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedAgent(null);
    setMessages([]);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800";
      case "busy":
        return "bg-yellow-100 text-yellow-800";
      case "offline":
        return "bg-gray-100 text-gray-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "orchestrator":
        return "bg-blue-100 text-blue-800";
      case "builder":
        return "bg-indigo-100 text-indigo-800";
      case "debugger":
        return "bg-purple-100 text-purple-800";
      case "verifier":
        return "bg-teal-100 text-teal-800";
      case "assistant":
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">AI Agents</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Add a new AI agent to your team. Define its name, role, and description to help with specific tasks.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Agent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Code Assistant" {...field} className="text-xs sm:text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Role</FormLabel>
                      <FormControl>
                        <select 
                          className="w-full p-2 border rounded-md text-xs sm:text-sm" 
                          {...field}
                        >
                          <option value="orchestrator">Orchestrator</option>
                          <option value="builder">Builder</option>
                          <option value="debugger">Debugger</option>
                          <option value="verifier">Verifier</option>
                          <option value="assistant">Assistant</option>
                        </select>
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
                      <FormLabel className="text-xs sm:text-sm">Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the agent's responsibilities and capabilities..." 
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
                      <FormLabel className="text-xs sm:text-sm">Initial Status</FormLabel>
                      <FormControl>
                        <select 
                          className="w-full p-2 border rounded-md text-xs sm:text-sm" 
                          {...field}
                        >
                          <option value="offline">Offline</option>
                          <option value="online">Online</option>
                          <option value="busy">Busy</option>
                        </select>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" size="sm" className="text-xs sm:text-sm">Create Agent</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card className="w-full text-center py-8 sm:py-12">
          <CardContent>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4">No agents found. Create your first agent to get started.</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs sm:text-sm">Create Your First Agent</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {agents.map((agent: Agent) => (
            <Card key={agent.id} className="overflow-hidden">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                  <CardTitle className="text-base sm:text-lg">{agent.name}</CardTitle>
                  <Badge className={`text-xs ${getStatusColor(agent.status)}`}>
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-muted-foreground text-xs sm:text-sm">
                  <Badge className={`text-xs ${getRoleColor(agent.role)}`}>
                    {agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}
                  </Badge>
                  <span>Created: {new Date(agent.createdAt).toLocaleDateString()}</span>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-1">
                <p className="text-xs sm:text-sm text-gray-700 line-clamp-3">
                  {agent.description || "No description provided."}
                </p>
                <div className="mt-3 sm:mt-4 flex justify-end space-x-2">
                  <CreateFeatureDialog 
                    agentId={agent.id} 
                    trigger={
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs sm:text-sm"
                      >
                        Create Feature
                      </Button>
                    }
                  />
                  <LinkFeatureDialog 
                    agentId={agent.id} 
                    trigger={
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs sm:text-sm"
                      >
                        Link Feature
                      </Button>
                    }
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs sm:text-sm"
                    onClick={() => handleOpenChat(agent)}
                  >
                    Communicate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Agent Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={(open) => {
        if (!open) handleCloseChat();
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedAgent && (
                <div className="flex items-center gap-2">
                  <span>Chat with {selectedAgent.name}</span>
                  <Badge className={`text-xs ${getRoleColor(selectedAgent.role)}`}>
                    {selectedAgent.role.charAt(0).toUpperCase() + selectedAgent.role.slice(1)}
                  </Badge>
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedAgent?.description || "Ask any questions to get assistance with your tasks."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Chat Messages */}
          <ScrollArea className="flex-grow border rounded-md p-3 my-2 h-[300px]">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`mb-3 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div 
                  className={`inline-block p-3 rounded-lg text-xs sm:text-sm max-w-[80%] ${
                    message.sender === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-muted text-muted-foreground mr-auto'
                  }`}
                >
                  {message.content}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
            {isLoadingResponse && (
              <div className="text-left mb-3">
                <div className="inline-block p-3 rounded-lg text-xs sm:text-sm bg-muted text-muted-foreground animate-pulse">
                  Agent is typing...
                </div>
              </div>
            )}
          </ScrollArea>
          
          {/* Chat Input */}
          <Form {...chatForm}>
            <form onSubmit={chatForm.handleSubmit(handleChatSubmit)} className="flex gap-2">
              <FormField
                control={chatForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormControl>
                      <Input 
                        placeholder="Type your message..." 
                        {...field} 
                        className="text-xs sm:text-sm"
                        disabled={isLoadingResponse}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                size="sm" 
                className="text-xs sm:text-sm"
                disabled={isLoadingResponse}
              >
                Send
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}