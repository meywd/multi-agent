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
  const response = await apiRequest(
    "POST", 
    `/api/agents/${agentId}/query`, 
    { prompt, includeContext }
  );
  
  const data = await response.json();
  return data.response;
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
  
  const response = await apiRequest("POST", "/api/code/analyze", payload);
  return response.json();
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
  const response = await apiRequest(
    "POST", 
    "/api/code/generate", 
    { 
      specification, 
      language: options.language, 
      framework: options.framework, 
      existingCode: options.existingCode 
    }
  );
  
  const data = await response.json();
  return data.code || data;
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
  const response = await apiRequest(
    "POST", 
    "/api/code/verify", 
    { 
      requirements, 
      implementation, 
      testCases: testCases ? testCases.join('\n') : undefined
    }
  );
  
  return response.json();
}