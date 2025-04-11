import { apiRequest } from "./queryClient";
import { sendWebSocketMessage } from "./websocket";

// Store for tracking pending agent queries
export const pendingAgentQueries: {
  [jobId: string]: {
    agentId: number;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }
} = {};

/**
 * Send a query to a specific agent with asynchronous WebSocket response
 */
export async function queryAgent({ 
  agentId, 
  prompt, 
  includeContext = true 
}: { 
  agentId: number; 
  prompt: string; 
  includeContext?: boolean; 
}): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Make the initial API request
      const response = await apiRequest({
        method: "POST", 
        url: `/api/agents/${agentId}/query`, 
        body: { prompt, includeContext }
      });
      
      // If response contains a status of "processing" and a jobId, 
      // register this query to receive WebSocket updates
      if (response.status === "processing" && response.jobId) {
        // Store the callbacks to resolve/reject this promise when the WebSocket message arrives
        pendingAgentQueries[response.jobId] = {
          agentId,
          resolve,
          reject,
          // Set a timeout to reject the promise if no WebSocket response is received
          timeout: setTimeout(() => {
            if (pendingAgentQueries[response.jobId]) {
              pendingAgentQueries[response.jobId].reject(
                new Error("Query timed out waiting for response")
              );
              delete pendingAgentQueries[response.jobId];
            }
          }, 60000) // 60 second timeout
        };
        
        // Return the placeholder response immediately for UI feedback
        return response.response;
      } else {
        // If the API response is complete (not async), resolve immediately
        resolve(response.response);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Analyze code and get feedback/issues
 */
export async function analyzeCode({ 
  code, 
  context = "General code review",
  taskId
}: { 
  code: string; 
  context?: string;
  taskId?: number;
}): Promise<{
  issues: Array<{
    type: string;
    title: string;
    description: string;
    code?: string;
    solution?: string;
  }>;
  suggestions: string[];
}> {
  const payload: any = { code, context };
  
  if (taskId) {
    payload.taskId = taskId;
  }
  
  const response = await apiRequest({
    method: "POST", 
    url: "/api/code/analyze", 
    body: payload
  });
  
  return response;
}

/**
 * Generate code based on a specification
 */
export async function generateCode(
  specification: string,
  options: {
    language: string;
    framework?: string;
    existingCode?: string;
  }
): Promise<string> {
  const response = await apiRequest({
    method: "POST", 
    url: "/api/code/generate", 
    body: { 
      specification, 
      language: options.language, 
      framework: options.framework, 
      existingCode: options.existingCode 
    }
  });
  
  // The response is already JSON parsed by apiRequest
  // If the code is wrapped in markdown code blocks, strip them
  let code = response.code || "";
  
  // Remove markdown code block syntax if present
  if (code.startsWith("```") && code.endsWith("```")) {
    // Extract language and code without the backticks
    const lines = code.split("\n");
    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];
    
    if (firstLine.startsWith("```") && lastLine === "```") {
      // Remove the first and last lines (the backticks)
      code = lines.slice(1, lines.length - 1).join("\n");
    }
  }
  
  return code;
}

/**
 * Verify an implementation against requirements
 */
export async function verifyImplementation({
  requirements,
  implementation,
  testCases
}: {
  requirements: string;
  implementation: string;
  testCases?: string[];
}): Promise<{
  passed: boolean;
  score: number;
  feedback: string;
  issues: string[];
}> {
  const response = await apiRequest({
    method: "POST", 
    url: "/api/code/verify", 
    body: { 
      requirements, 
      implementation, 
      testCases: testCases ? testCases.join('\n') : undefined
    }
  });
  
  return response;
}