import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgentContext } from "@/context/AgentContext";
import { queryAgent } from "@/lib/aiService";
import { useToast } from "@/hooks/use-toast";

export function AgentInteractionPanel() {
  const { selectedAgent, agents } = useAgentContext();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const responseContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const selectedAgentInfo = selectedAgent 
    ? agents.find(a => a.id === selectedAgent) 
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a message to communicate with the agent.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedAgent) {
      toast({
        title: "No agent selected",
        description: "Please select an agent to communicate with.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get agent response
      const agentResponse = await queryAgent({
        agentId: selectedAgent,
        prompt: prompt.trim()
      });
      
      setResponse(agentResponse);
      
      // Clear the prompt
      setPrompt("");
    } catch (error) {
      console.error("Error communicating with agent:", error);
      toast({
        title: "Communication failed",
        description: "Failed to communicate with the agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when response changes
  useEffect(() => {
    if (responseContainerRef.current) {
      responseContainerRef.current.scrollTop = responseContainerRef.current.scrollHeight;
    }
  }, [response]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {selectedAgentInfo 
            ? `Agent Communication: ${selectedAgentInfo.name}` 
            : "Agent Communication"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div 
          className="flex-grow border rounded-md p-4 bg-neutral-50 overflow-auto mb-4"
          ref={responseContainerRef}
        >
          {response ? (
            <div className="whitespace-pre-wrap">{response}</div>
          ) : (
            <div className="text-neutral-500 text-sm flex items-center justify-center h-full">
              {selectedAgentInfo
                ? `Send a message to ${selectedAgentInfo.name} to start the conversation.`
                : "Select an agent to begin communication."}
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Textarea
            placeholder={selectedAgentInfo
              ? `Message to ${selectedAgentInfo.name}...`
              : "Select an agent to begin..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!selectedAgentInfo || isLoading}
            className="min-h-[100px] resize-none"
          />
          <Button 
            type="submit" 
            disabled={!selectedAgentInfo || isLoading || !prompt.trim()}
            className="self-end"
          >
            {isLoading ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}