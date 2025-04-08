import { useState, useEffect, useRef } from "react";
import { useAgentContext } from "@/context/AgentContext";
import { Log } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export function AgentMonitorPanel() {
  const { agents, logs, getAgentLogs, setSelectedAgent } = useAgentContext();
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [currentAgentLogs, setCurrentAgentLogs] = useState<Log[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (agents.length > 0 && !currentAgentId) {
      // Default to the first agent if none selected
      const firstAgentId = agents[0].id.toString();
      setCurrentAgentId(firstAgentId);
      setSelectedAgent(agents[0].id);
      getAgentLogs(agents[0].id);
    }
  }, [agents, currentAgentId, getAgentLogs, setSelectedAgent]);

  useEffect(() => {
    if (currentAgentId) {
      const agentLogs = logs[parseInt(currentAgentId)] || [];
      setCurrentAgentLogs(agentLogs);
    }
  }, [logs, currentAgentId]);

  useEffect(() => {
    // Auto-scroll to the bottom when new logs are added
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [currentAgentLogs]);

  const handleAgentChange = (value: string) => {
    setCurrentAgentId(value);
    setSelectedAgent(parseInt(value));
    getAgentLogs(parseInt(value));
  };

  const getLogTypeClass = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-error';
      case 'warning':
        return 'text-warning';
      case 'success':
        return 'text-success';
      default:
        return 'text-neutral-700';
    }
  };

  const getAgentNameById = (id: number) => {
    const agent = agents.find(a => a.id === id);
    return agent ? agent.name : `Agent #${id}`;
  };

  return (
    <Card className="h-96">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-neutral-800">Agent Activity</h2>
          <div className="flex space-x-2">
            <Select
              value={currentAgentId || ""}
              onValueChange={handleAgentChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div 
          ref={logsContainerRef}
          className="h-72 overflow-y-auto scrollbar-thin border border-neutral-200 rounded-md bg-neutral-50 p-3 font-mono text-sm"
        >
          {currentAgentLogs.length === 0 ? (
            <div className="text-center text-neutral-500 py-4">
              No activity logs available
            </div>
          ) : (
            <div className="space-y-2">
              {currentAgentLogs.map((log) => (
                <div key={log.id}>
                  <div className="text-neutral-500 text-xs">
                    [{log.agentId === parseInt(currentAgentId || "0") 
                      ? getAgentNameById(log.agentId) 
                      : getAgentNameById(log.agentId)}] 
                    <span className="text-neutral-400">
                      {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                    </span>
                  </div>
                  <div className={`ml-4 ${getLogTypeClass(log.type)}`}>
                    {log.message}
                    {log.details && (
                      <pre className="bg-neutral-800 text-neutral-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                        {log.details}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
