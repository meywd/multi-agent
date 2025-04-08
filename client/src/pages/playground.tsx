import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CodePlayground } from "@/components/dashboard/CodePlayground";
import { apiRequest } from "@/lib/queryClient";

interface Agent {
  id: number;
  name: string;
  role: string;
  status: string;
}

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState("codePlayground");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [agentResponse, setAgentResponse] = useState("");
  const { toast } = useToast();

  // Load agents on component mount
  useEffect(() => {
    async function loadAgents() {
      setIsLoading(true);
      try {
        const agentsData = await apiRequest({
          url: "/api/agents",
          method: "GET"
        });
        
        setAgents(agentsData || []);
        if (agentsData && agentsData.length > 0) {
          setSelectedAgentId(agentsData[0].id);
        }
      } catch (error) {
        console.error("Error loading agents:", error);
        toast({
          title: "Error",
          description: "Failed to load agents. Check console for details.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadAgents();
  }, [toast]);

  const handleAgentQuery = async () => {
    if (!selectedAgentId || !prompt.trim()) {
      toast({
        title: "Input required",
        description: "Please select an agent and enter a prompt.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setAgentResponse("");
    
    try {
      const responseData = await apiRequest({
        url: `/api/agents/${selectedAgentId}/query`,
        method: "POST",
        body: { prompt, includeContext: true },
      });
      
      if (responseData) {
        setAgentResponse(responseData.response);
      }
    } catch (error) {
      console.error("Error querying agent:", error);
      toast({
        title: "Query failed",
        description: "Failed to get a response from the agent. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">AI Agent Playground</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Interact with specialized AI agents and test code generation
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="agentInteraction">Agent Interaction</TabsTrigger>
          <TabsTrigger value="codePlayground">Code Playground</TabsTrigger>
        </TabsList>
        
        <TabsContent value="agentInteraction">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Available Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {isLoading && agents.length === 0 ? (
                    <p className="text-sm text-neutral-600">Loading agents...</p>
                  ) : agents.length === 0 ? (
                    <p className="text-sm text-neutral-600">No agents available.</p>
                  ) : (
                    agents.map(agent => (
                      <div
                        key={agent.id}
                        className={`p-3 rounded-md cursor-pointer ${
                          selectedAgentId === agent.id
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-neutral-50 border border-neutral-200 hover:bg-neutral-100"
                        }`}
                        onClick={() => setSelectedAgentId(agent.id)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{agent.name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            agent.status === "active" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {agent.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600">{agent.role}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Agent Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your prompt or question for the agent..."
                    className="min-h-[120px]"
                  />
                </div>
                <Button 
                  onClick={handleAgentQuery}
                  disabled={isLoading || !selectedAgentId || !prompt.trim()}
                  className="mb-6"
                >
                  {isLoading ? "Sending..." : "Send to Agent"}
                </Button>
                
                {agentResponse && (
                  <div className="p-4 bg-neutral-50 rounded-md border border-neutral-200">
                    <h3 className="text-sm font-medium mb-2">Response:</h3>
                    <div className="whitespace-pre-wrap text-sm">
                      {agentResponse}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="codePlayground">
          <CodePlayground />
        </TabsContent>
      </Tabs>
    </div>
  );
}