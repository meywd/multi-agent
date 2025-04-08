import { useState, useEffect } from "react";
import { useAgentContext } from "@/context/AgentContext";
import { Issue } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export function DebugConsole() {
  const { issues } = useAgentContext();
  const [filter, setFilter] = useState<"all" | "errors" | "warnings">("all");
  
  const errors = issues.filter(issue => issue.type === "error" && !issue.resolved);
  const warnings = issues.filter(issue => issue.type === "warning" && !issue.resolved);
  
  const filteredIssues = filter === "all" 
    ? issues.filter(issue => !issue.resolved)
    : filter === "errors" 
      ? errors 
      : warnings;

  const handleResolveIssue = async (id: number) => {
    try {
      await apiRequest("PATCH", `/api/issues/${id}/resolve`);
    } catch (error) {
      console.error("Error resolving issue:", error);
    }
  };

  return (
    <Card className="h-96">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-neutral-800">Debug Console</h2>
          <div className="flex space-x-2">
            <Button
              variant={filter === "errors" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setFilter("errors")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1 h-4 w-4"
              >
                <path d="m10.29 3.86-.6 6a1 1 0 0 0 1.42 1.45l1.12-.94 1.07.9a1 1 0 0 0 1.42-1.44l-3.77-5.03a1 1 0 0 0-1.66.05z" />
                <path d="M1 14s.18-2 2-2 2.82-.67 3-3c.16-2.05 1.87-2.93 4-3 1.76-.05 2.86.48 4 2 .95 1.25 2 2 3 2s2 1 2 2" />
                <path d="M5 18c8 0 8.5 2 13.5-2.29" />
                <path d="M5 22c8 0 8.5-4 13.5-8.29" />
              </svg>
              {errors.length} Error{errors.length !== 1 && "s"}
            </Button>
            <Button
              variant={filter === "warnings" ? "warning" : "outline"}
              size="sm"
              onClick={() => setFilter("warnings")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1 h-4 w-4"
              >
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M2.5 6.5A4.95 4.95 0 0 1 7 5c1.3 0 2.5.47 3.43 1.26A6 6 0 0 1 21 11a6 6 0 0 1-12 0 4.98 4.98 0 0 1-6.5-4.5z" />
              </svg>
              {warnings.length} Warning{warnings.length !== 1 && "s"}
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
          </div>
        </div>
        
        <div className="h-72 overflow-y-auto scrollbar-thin border border-neutral-200 rounded-md bg-neutral-800 p-3 font-mono text-xs text-neutral-300">
          {filteredIssues.length === 0 ? (
            <div className="text-center text-neutral-500 py-4">
              No {filter !== "all" ? filter : ""} issues found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div key={issue.id} className={issue.type === "error" ? "text-error" : "text-warning"}>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">[{issue.type.toUpperCase()}]</span>
                    <span className="text-neutral-400">{format(new Date(issue.createdAt), "HH:mm:ss")}</span>
                    <span>{issue.title}</span>
                  </div>
                  <div className="text-neutral-300 ml-6">
                    <span>{issue.description}</span>
                    {issue.code && (
                      <pre className="bg-neutral-900 p-2 rounded mt-1 overflow-x-auto">
                        {issue.code}
                      </pre>
                    )}
                  </div>
                  {issue.solution && (
                    <div className="text-neutral-300 ml-6">
                      <span>Suggested fix:</span>
                      <pre className={`bg-neutral-900 p-2 rounded mt-1 overflow-x-auto ${issue.type === "error" ? "text-success" : "text-neutral-300"}`}>
                        {issue.solution}
                      </pre>
                    </div>
                  )}
                  <div className="flex justify-end mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-neutral-400 hover:text-neutral-200"
                      onClick={() => handleResolveIssue(issue.id)}
                    >
                      Mark as resolved
                    </Button>
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
