import { useState } from "react";
import { useAgentContext } from "@/context/AgentContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryAgent } from "@/lib/aiService";
import { useToast } from "@/hooks/use-toast";

export function AgentInteractionPanel() {
  const { agents, setSelectedAgent, selectedAgent } = useAgentContext();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAgentChange = (agentId: string) => {
    setSelectedAgent(parseInt(agentId));
    setResponse(""); // Clear previous responses when changing agents
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedAgent) {
      toast({
        title: "Error",
        description: "Please select an agent",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await queryAgent(selectedAgent, prompt);
      setResponse(result);
    } catch (error) {
      console.error("Error querying agent:", error);
      toast({
        title: "Error",
        description: "Failed to get response from agent",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get agent role and display a hint based on the role
  const getAgentHint = () => {
    if (!selectedAgent) return "Select an agent to interact with";
    
    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return "Select an agent to interact with";
    
    switch (agent.role) {
      case 'coordinator':
        return "Ask about task coordination, prioritization, or system overview";
      case 'developer':
        return "Request code generation, implementation strategies, or developer insights";
      case 'qa':
        return "Ask for code analysis, debugging help, or quality improvement suggestions";
      case 'tester':
        return "Request verification of implementations, test case design, or validation strategies";
      default:
        return "Enter your prompt for the agent";
    }
  };

  return (
    <Card className="h-96">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-neutral-800">Agent Interaction</h2>
          <div className="flex space-x-2">
            <Select
              value={selectedAgent ? selectedAgent.toString() : ""}
              onValueChange={handleAgentChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.name} ({agent.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-xs text-neutral-500 mb-1">{getAgentHint()}</p>
            <Textarea
              placeholder="Enter your prompt for the agent"
              value={prompt}
              onChange={handlePromptChange}
              className="min-h-[100px] font-medium"
            />
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="mr-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  Processing...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </div>
        </form>
        
        {response && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-2">Agent Response:</h3>
            <div className="bg-neutral-100 p-3 rounded-md text-sm border border-neutral-200 max-h-[220px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-neutral-800">{response}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}