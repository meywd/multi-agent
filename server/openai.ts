import OpenAI from "openai";
import type { Agent, Task, Log, Issue } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System prompts for different agent roles
const SYSTEM_PROMPTS = {
  coordinator: `You are the Coordinator Agent in a multi-agent AI system. Your role is to:
1. Coordinate tasks between specialized AI agents
2. Prioritize tasks and assign them to appropriate agents
3. Monitor overall system performance and handle exceptions
4. Resolve conflicts between agents
5. Ensure smooth communication flow`,

  developer: `You are the Developer Agent in a multi-agent AI system. Your role is to:
1. Write clean, efficient code based on specifications
2. Follow best practices and patterns for the target language/framework
3. Implement features and functionalities
4. Document code appropriately
5. Cooperate with the debugging agent to resolve issues`,

  qa: `You are the QA Agent in a multi-agent AI system. Your role is to:
1. Debug code written by the developer agent
2. Identify bugs, edge cases, and potential improvements
3. Provide detailed error reports with suggested fixes
4. Perform static code analysis
5. Ensure the code meets quality standards`,

  tester: `You are the Tester Agent in a multi-agent AI system. Your role is to:
1. Verify that implementations match specifications
2. Design and run test cases for different scenarios
3. Validate edge cases and error handling
4. Report verification results
5. Ensure the application meets user requirements`
};

/**
 * Handles agent communications by determining what to say based on role
 */
export async function getAgentResponse(
  agent: Agent, 
  prompt: string, 
  context: {
    recentLogs?: Log[],
    relatedTasks?: Task[],
    relatedIssues?: Issue[]
  } = {}
): Promise<string> {
  
  // Build messages array with system prompt and context
  const messages = [
    { role: "system", content: SYSTEM_PROMPTS[agent.role as keyof typeof SYSTEM_PROMPTS] || "You are an AI assistant" },
  ];
  
  // Add context information if available
  if (context.recentLogs?.length) {
    const logsContent = context.recentLogs
      .map(log => `[${new Date(log.timestamp || new Date()).toISOString()}] ${log.type.toUpperCase()}: ${log.message}`)
      .join('\n');
    
    messages.push({ 
      role: "system", 
      content: `Recent system logs:\n${logsContent}` 
    });
  }
  
  if (context.relatedTasks?.length) {
    const tasksContent = context.relatedTasks
      .map(task => `Task #${task.id}: ${task.title} (${task.status}) - ${task.description}`)
      .join('\n');
    
    messages.push({ 
      role: "system", 
      content: `Related tasks:\n${tasksContent}` 
    });
  }
  
  if (context.relatedIssues?.length) {
    const issuesContent = context.relatedIssues
      .map(issue => `Issue #${issue.id}: ${issue.title} (${issue.type}) - ${issue.description}`)
      .join('\n');
    
    messages.push({ 
      role: "system", 
      content: `Related issues:\n${issuesContent}` 
    });
  }
  
  // Add user prompt
  messages.push({ role: "user", content: prompt });
  
  // Get response from OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 800
  });
  
  return response.choices[0].message.content || "Unable to generate a response.";
}

/**
 * Analyzes code for issues and improvements
 */
export async function analyzeCode(
  code: string,
  context: string
): Promise<{
  issues: { type: string, title: string, description: string, code?: string, solution?: string }[],
  suggestions: string[]
}> {
  
  const prompt = `Analyze the following code for issues, bugs, and potential improvements.
Context: ${context}

CODE:
\`\`\`
${code}
\`\`\`

Provide your analysis in JSON format with the following structure:
{
  "issues": [
    {
      "type": "error", // or "warning"
      "title": "Brief issue title",
      "description": "Detailed description of the issue",
      "code": "The problematic code snippet",
      "solution": "Suggested fix for the issue"
    }
  ],
  "suggestions": [
    "Suggestion 1 for improving the code",
    "Suggestion 2 for improving the code"
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a code analysis expert specialized in identifying bugs and code quality issues." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3
  });
  
  try {
    const analysisResult = JSON.parse(response.choices[0].message.content || "{}");
    return {
      issues: analysisResult.issues || [],
      suggestions: analysisResult.suggestions || []
    };
  } catch (error) {
    console.error("Error parsing code analysis response:", error);
    return { issues: [], suggestions: [] };
  }
}

/**
 * Generates code based on a specification
 */
export async function generateCode(
  specification: string,
  context: {
    language: string,
    framework?: string,
    existingCode?: string
  }
): Promise<string> {
  
  const frameworkContext = context.framework ? `using the ${context.framework} framework` : '';
  
  const prompt = `Generate ${context.language} code ${frameworkContext} based on the following specification:
  
${specification}

${context.existingCode ? `Here is the existing code to build upon or modify:
\`\`\`
${context.existingCode}
\`\`\`
` : ''}

Provide only the code without explanations or markdown formatting.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: `You are an expert ${context.language} developer${context.framework ? ` specializing in ${context.framework}` : ''}. 
Write clean, maintainable, and efficient code.` 
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });
  
  return response.choices[0].message.content || "// Unable to generate code";
}

/**
 * Verifies implementation against requirements
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
  
  let prompt = `Verify if the following implementation meets the specified requirements:
  
Requirements:
${requirements}

Implementation:
\`\`\`
${implementation}
\`\`\`
`;

  if (testCases && testCases.length > 0) {
    prompt += `\nTest cases to consider:\n${testCases.map(test => `- ${test}`).join('\n')}`;
  }
  
  prompt += `\n\nProvide your verification in JSON format with the following structure:
{
  "passed": true/false,
  "score": 0-100 percentage score,
  "feedback": "Overall assessment of how well the implementation meets requirements",
  "issues": [
    "Issue 1 that needs to be addressed",
    "Issue 2 that needs to be addressed"
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: "You are a verification expert who thoroughly evaluates if implementations meet requirements. Be detailed and critical in your assessment."
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2
  });
  
  try {
    const verificationResult = JSON.parse(response.choices[0].message.content || "{}");
    return {
      passed: verificationResult.passed || false,
      score: verificationResult.score || 0,
      feedback: verificationResult.feedback || "No feedback provided",
      issues: verificationResult.issues || []
    };
  } catch (error) {
    console.error("Error parsing verification response:", error);
    return {
      passed: false,
      score: 0,
      feedback: "Error processing verification result",
      issues: ["Verification process failed"]
    };
  }
}