import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent } from "@/lib/types";

interface AgentCommunicationFlowProps {
  agents: Agent[];
}

export function AgentCommunicationFlow({ agents }: AgentCommunicationFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || agents.length < 2) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      const containerWidth = canvas.parentElement?.clientWidth || 600;
      const containerHeight = canvas.parentElement?.clientHeight || 300;
      
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      
      // Redraw on resize
      drawAgentGraph();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Draw agent communication graph
    function drawAgentGraph() {
      if (!ctx || !canvas) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Limit to max of 5 agents for visualization
      const displayAgents = agents.slice(0, 5);
      const agentCount = displayAgents.length;
      
      if (agentCount < 2) return;
      
      // Calculate positions in a circle
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.7;
      
      // Draw connections first (so they appear behind the nodes)
      ctx.lineWidth = 2;
      
      // Draw different types of connections based on agent roles
      for (let i = 0; i < agentCount; i++) {
        for (let j = i + 1; j < agentCount; j++) {
          const agent1 = displayAgents[i];
          const agent2 = displayAgents[j];
          
          const angle1 = (i / agentCount) * 2 * Math.PI;
          const angle2 = (j / agentCount) * 2 * Math.PI;
          
          const x1 = centerX + radius * Math.cos(angle1);
          const y1 = centerY + radius * Math.sin(angle1);
          const x2 = centerX + radius * Math.cos(angle2);
          const y2 = centerY + radius * Math.sin(angle2);
          
          // Determine connection pattern based on agent roles
          if (agent1.role === "coordinator" || agent2.role === "coordinator") {
            // Coordinator connections are solid and prominent
            ctx.strokeStyle = "rgba(139, 92, 246, 0.6)"; // Purple
            ctx.setLineDash([]);
          } else if (
            (agent1.role === "developer" && agent2.role === "qa") || 
            (agent1.role === "qa" && agent2.role === "developer")
          ) {
            // Developer to QA connections are dashed
            ctx.strokeStyle = "rgba(59, 130, 246, 0.6)"; // Blue
            ctx.setLineDash([5, 3]);
          } else if (
            (agent1.role === "qa" && agent2.role === "tester") || 
            (agent1.role === "tester" && agent2.role === "qa")
          ) {
            // QA to Tester connections are dotted
            ctx.strokeStyle = "rgba(234, 179, 8, 0.6)"; // Yellow
            ctx.setLineDash([2, 2]);
          } else {
            // Other connections
            ctx.strokeStyle = "rgba(156, 163, 175, 0.4)"; // Gray
            ctx.setLineDash([]);
          }
          
          // Draw the line
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
      
      // Reset line dash
      ctx.setLineDash([]);
      
      // Draw agent nodes
      for (let i = 0; i < agentCount; i++) {
        const agent = displayAgents[i];
        const angle = (i / agentCount) * 2 * Math.PI;
        
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // Node background color based on agent role
        let nodeColor;
        switch (agent.role) {
          case "coordinator":
            nodeColor = "#c084fc"; // Purple
            break;
          case "developer":
            nodeColor = "#60a5fa"; // Blue
            break;
          case "qa":
            nodeColor = "#fcd34d"; // Yellow
            break;
          case "tester":
            nodeColor = "#4ade80"; // Green
            break;
          default:
            nodeColor = "#9ca3af"; // Gray
        }
        
        // Status indicator color
        let statusColor;
        switch (agent.status) {
          case "active":
            statusColor = "#10b981"; // Green
            break;
          case "inactive":
            statusColor = "#9ca3af"; // Gray
            break;
          case "busy":
            statusColor = "#f59e0b"; // Amber
            break;
          case "error":
            statusColor = "#ef4444"; // Red
            break;
          default:
            statusColor = "#9ca3af"; // Gray
        }
        
        // Draw agent node
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, 2 * Math.PI);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = nodeColor;
        ctx.stroke();
        
        // Draw status indicator
        ctx.beginPath();
        ctx.arc(x + 15, y - 15, 6, 0, 2 * Math.PI);
        ctx.fillStyle = statusColor;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "white";
        ctx.stroke();
        
        // Draw agent name
        ctx.font = "12px Arial";
        ctx.fillStyle = "#4b5563";
        ctx.textAlign = "center";
        ctx.fillText(agent.name, x, y + 40);
      }
    }
    
    drawAgentGraph();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [agents]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Agent Communication Flow</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] relative">
        {agents.length < 2 ? (
          <div className="flex justify-center items-center h-full text-neutral-500 text-sm">
            Need at least 2 agents to visualize communication flow.
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            className="w-full h-full"
          />
        )}
      </CardContent>
    </Card>
  );
}