import { useEffect, useRef } from "react";
import { Agent } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface AgentCommunicationFlowProps {
  agents: Agent[];
}

export function AgentCommunicationFlow({ agents }: AgentCommunicationFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper function to get agent color based on role
  const getAgentColor = (role: string) => {
    switch (role) {
      case 'coordinator':
        return '#5C6BC0'; // secondary
      case 'developer':
        return '#3F51B5'; // primary
      case 'qa':
        return '#FF9800'; // warning
      case 'tester':
        return '#616E7C'; // neutral
      default:
        return '#616E7C';
    }
  };

  // Helper function to get background color based on role
  const getAgentBgColor = (role: string) => {
    switch (role) {
      case 'coordinator':
        return 'rgba(92, 107, 192, 0.2)';
      case 'developer':
        return 'rgba(63, 81, 181, 0.2)';
      case 'qa':
        return 'rgba(255, 152, 0, 0.2)';
      case 'tester':
        return 'rgba(97, 110, 124, 0.2)';
      default:
        return 'rgba(97, 110, 124, 0.2)';
    }
  };

  useEffect(() => {
    // Simple force-directed visualization for demo purposes
    let animationId: number;
    
    const update = () => {
      // This is a simplified version, in a real app you would implement 
      // proper force-directed graph layout using D3.js or similar
      animationId = requestAnimationFrame(update);
    };
    
    update();
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [agents]);

  const coordinatorAgent = agents.find(a => a.role === 'coordinator');
  const developerAgent = agents.find(a => a.role === 'developer');
  const qaAgent = agents.find(a => a.role === 'qa');
  const testerAgent = agents.find(a => a.role === 'tester');

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-neutral-800">Agent Communication Flow</h2>
          <div className="flex space-x-2">
            <button className="text-neutral-500 hover:text-neutral-900 p-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
                <path d="M7 12h10" />
                <path d="M12 7v10" />
              </svg>
            </button>
            <button className="text-neutral-500 hover:text-neutral-900 p-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </div>
        </div>
        
        <div ref={containerRef} className="h-80 relative">
          {/* Simplified agent communication visualization */}
          <div className="absolute inset-0 w-full h-full">
            {/* Orchestrator Agent */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-secondary-light bg-opacity-20 flex items-center justify-center border-2 border-secondary z-10">
              <span className="font-medium text-secondary text-sm">{coordinatorAgent?.name || "Orchestrator"}</span>
            </div>
            
            {/* Builder Agent */}
            <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-primary-light bg-opacity-20 flex items-center justify-center border-2 border-primary z-10">
              <span className="font-medium text-primary text-sm">{developerAgent?.name || "Builder"}</span>
            </div>
            
            {/* Debugger Agent */}
            <div className="absolute top-1/4 right-1/4 transform translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-warning bg-opacity-20 flex items-center justify-center border-2 border-warning z-10">
              <span className="font-medium text-warning text-sm">{qaAgent?.name || "Debugger"}</span>
            </div>
            
            {/* Verifier Agent */}
            <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center border-2 border-neutral-400 z-10">
              <span className="font-medium text-neutral-700 text-sm">{testerAgent?.name || "Verifier"}</span>
            </div>
            
            {/* Connection lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#3F51B5" />
                </marker>
              </defs>
              
              {/* Orchestrator to Builder */}
              <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#3F51B5" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrowhead)" />
              
              {/* Builder to Debugger */}
              <line x1="25%" y1="25%" x2="75%" y2="25%" stroke="#5C6BC0" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrowhead)" />
              
              {/* Debugger to Verifier */}
              <line x1="75%" y1="25%" x2="50%" y2="75%" stroke="#FF9800" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrowhead)" />
              
              {/* Verifier to Orchestrator */}
              <line x1="50%" y1="75%" x2="50%" y2="50%" stroke="#616E7C" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrowhead)" />
              
              {/* Active communication pulse */}
              <circle cx="62.5%" cy="37.5%" r="5" fill="#FF9800" className="animate-pulse" />
            </svg>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 mt-4 text-sm text-neutral-600">
            <div className="flex items-center mb-2">
              <span className="w-3 h-3 bg-secondary rounded-full mr-2"></span>
              <span>Command flow</span>
              <span className="w-3 h-3 bg-primary rounded-full ml-6 mr-2"></span>
              <span>Data transfer</span>
              <span className="w-3 h-3 bg-warning rounded-full ml-6 mr-2"></span>
              <span>Active communication</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
