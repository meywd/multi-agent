import { apiRequest } from "./queryClient";

/**
 * Send a query to a specific agent and get a response
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
  const response = await apiRequest({
    method: "POST", 
    url: `/api/agents/${agentId}/query`, 
    body: { prompt, includeContext }
  });
  
  return response.response;
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