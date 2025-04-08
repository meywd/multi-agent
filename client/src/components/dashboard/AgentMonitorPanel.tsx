import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAgentContext } from "@/context/AgentContext";
import { updateAgentStatus } from "@/lib/agentService";
import { useToast } from "@/hooks/use-toast";

export function AgentMonitorPanel() {
  const { agents, selectedAgent, setSelectedAgent } = useAgentContext();
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const { toast } = useToast();

  const handleSelectAgent = (agentId: number) => {
    setSelectedAgent(agentId === selectedAgent ? null : agentId);
  };

  const handleToggleStatus = async (agentId: number, currentStatus: string) => {
    setUpdatingStatus(agentId);
    
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      await updateAgentStatus(agentId, newStatus);
      
      toast({
        title: "Status updated",
        description: `Agent status set to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating agent status:", error);
      toast({
        title: "Update failed",
        description: "Failed to update agent status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getAgentStatusIndicator = (status: string) => {
    if (status === "active") {
      return (
        <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
      );
    } else if (status === "inactive") {
      return <span className="h-2.5 w-2.5 rounded-full bg-neutral-300"></span>;
    } else if (status === "busy") {
      return (
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
      );
    } else if (status === "error") {
      return <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>;
    }
    
    return <span className="h-2.5 w-2.5 rounded-full bg-neutral-300"></span>;
  };
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case "coordinator":
        return "bg-purple-100 text-purple-800";
      case "developer":
        return "bg-blue-100 text-blue-800";
      case "qa":
        return "bg-yellow-100 text-yellow-800";
      case "tester":
        return "bg-green-100 text-green-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Agent Monitor</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto max-h-[400px] px-0">
        {agents.length === 0 ? (
          <div className="flex justify-center items-center h-48 text-neutral-500 text-sm">
            No agents available. Create new agents to see them here.
          </div>
        ) : (
          <div className="space-y-2 px-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`p-4 rounded-md border ${
                  selectedAgent === agent.id
                    ? "border-primary bg-primary/5"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                } transition-colors cursor-pointer`}
                onClick={() => handleSelectAgent(agent.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="mt-1">{getAgentStatusIndicator(agent.status)}</div>
                    <div>
                      <h3 className="font-medium text-neutral-900">{agent.name}</h3>
                      <div className="flex mt-1 gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(agent.role)}`}>
                          {agent.role}
                        </span>
                        <span className="text-xs text-neutral-500">
                          ID: {agent.id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={updatingStatus === agent.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(agent.id, agent.status);
                    }}
                    className="h-8 px-2 text-xs"
                  >
                    {updatingStatus === agent.id ? (
                      "Updating..."
                    ) : agent.status === "active" ? (
                      "Deactivate"
                    ) : (
                      "Activate"
                    )}
                  </Button>
                </div>
                
                {agent.description && (
                  <p className="text-sm text-neutral-600 mt-2">{agent.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}