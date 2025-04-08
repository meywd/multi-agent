import { apiRequest } from "./queryClient";

/**
 * Send a query to a specific agent and get a response
 */
export async function queryAgent(
  agentId: number, 
  prompt: string, 
  includeContext: boolean = true
): Promise<string> {
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
export async function analyzeCode(
  code: string, 
  context: string = "General code review",
  taskId?: number
): Promise<{
  issues: any[],
  suggestions: string[]
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
  language: string,
  framework?: string,
  existingCode?: string
): Promise<string> {
  const response = await apiRequest(
    "POST", 
    "/api/code/generate", 
    { specification, language, framework, existingCode }
  );
  
  const data = await response.json();
  return data.code;
}

/**
 * Verify an implementation against requirements
 */
export async function verifyImplementation(
  requirements: string,
  implementation: string,
  testCases?: string[]
): Promise<{
  passed: boolean,
  score: number,
  feedback: string,
  issues: string[]
}> {
  const response = await apiRequest(
    "POST", 
    "/api/code/verify", 
    { requirements, implementation, testCases }
  );
  
  return response.json();
}