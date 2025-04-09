import OpenAI from "openai";
import type { Agent } from "@shared/schema";

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Error handler function
function handleAIError(error: any): string {
  console.error("OpenAI API Error:", error);
  
  if (error.response) {
    console.error("Status:", error.response.status);
    console.error("Data:", error.response.data);
    return `AI service error (${error.response.status}): ${error.response.data.error?.message || "Unknown error"}`;
  } else {
    return `AI service error: ${error.message || "Unknown error"}`;
  }
}

/**
 * Handles agent communications by determining what to say based on role
 */
export async function getAgentResponse(
  agent: Agent, 
  prompt: string, 
  context: any = {}
): Promise<string> {
  try {
    // Create a system message based on the agent's role
    let systemMessage = "";
    
    // Common task capabilities instructions for all agents
    const taskCapabilities = `
You can create tasks in the following format in your responses:
- Start with a clear task title 
- Provide a detailed description of what needs to be done
- Use bullet points for task breakdowns if needed
- Specify priority (low, medium, high)
- Optionally suggest which agent should handle the task

Our system will automatically extract tasks from your responses when you list or describe tasks that need to be done.
`;
    
    switch (agent.role) {
      case "coordinator":
        systemMessage = `You are an AI Coordinator Agent named ${agent.name}. Your role is to manage and prioritize tasks, coordinate between other agents, and provide high-level oversight of the development process.

As the coordinator, you are primarily responsible for:
1. Breaking down project requirements into manageable tasks
2. Assigning tasks to the appropriate agents (Developer, QA, Tester)
3. Monitoring progress and handling dependencies
4. Ensuring all requirements are met through proper task management

${taskCapabilities}

When a new project is started or when asked about tasks, provide a structured task breakdown with priorities and assignments.`;
        break;
      case "developer":
        systemMessage = `You are an AI Developer Agent named ${agent.name}. Your role is to write high-quality code, implement features, and find elegant solutions to technical problems.

As a developer, you specialize in:
1. Implementing frontend and backend functionality
2. Writing clean, maintainable code with proper documentation
3. Solving technical challenges efficiently
4. Following best practices for security and performance

${taskCapabilities}

When implementing features, you can suggest additional tasks that would improve the implementation or address technical debt.`;
        break;
      case "qa":
        systemMessage = `You are an AI QA Agent named ${agent.name}. Your role is to review code for bugs, edge cases, and potential issues.

As a QA specialist, you focus on:
1. Identifying potential bugs and edge cases
2. Suggesting improvements for reliability
3. Ensuring proper error handling
4. Checking for security vulnerabilities

${taskCapabilities}

When reviewing implementations, create tasks for issues that need to be fixed or improvements that should be made.`;
        break;
      case "tester":
        systemMessage = `You are an AI Tester Agent named ${agent.name}. Your role is to verify that implementations match specifications, design test cases, and ensure quality across the system.

As a tester, you excel at:
1. Creating comprehensive test plans and test cases
2. Verifying functionality against requirements
3. Testing edge cases and user scenarios
4. Ensuring a high-quality user experience

${taskCapabilities}

After testing, create tasks for any issues found or test cases that need to be implemented.`;
        break;
      default:
        systemMessage = `You are an AI Agent named ${agent.name}. ${agent.description || "Your role is to assist with software development tasks."}`;
    }
    
    // Add context information if available
    let contextMessage = "";
    
    // If there's a specific project in the context, give detailed information about it
    if (context.project) {
      const project = context.project;
      contextMessage += `Current Project Information:\n`;
      contextMessage += `- Name: ${project.name}\n`;
      contextMessage += `- Description: ${project.description || "No description provided"}\n`;
      contextMessage += `- Status: ${project.status}\n`;
      contextMessage += `- ID: ${project.id}\n`;
      
      if (project.requirements) {
        contextMessage += `\nProject Requirements:\n${project.requirements}\n\n`;
      }
      
      contextMessage += `\n`;
    }
    
    if (context.relatedTasks && context.relatedTasks.length > 0) {
      contextMessage += "Current project tasks:\n";
      context.relatedTasks.forEach((task: any) => {
        const assignedTo = task.assignedTo ? `assigned to agent #${task.assignedTo}` : 'unassigned';
        contextMessage += `- Task #${task.id}: ${task.title} (${task.status}, ${assignedTo}, ${task.progress || 0}% complete)\n`;
        if (task.description) {
          contextMessage += `  Description: ${task.description}\n`;
        }
      });
      contextMessage += "\n";
    } else if (context.project) {
      contextMessage += "This project currently has no tasks defined.\n\n";
    }
    
    // If we have explicit conversation history that was formatted in routes.ts, use that
    if (context.conversationHistory) {
      contextMessage += "Recent Conversation History:\n";
      contextMessage += context.conversationHistory;
      contextMessage += "\n\n";
    } 
    // Otherwise, fall back to the old way of constructing conversation history from logs
    else if (context.recentLogs && context.recentLogs.length > 0) {
      contextMessage += "Recent conversations and activity:\n";
      const conversationLogs = context.recentLogs
        .filter((log: any) => log.type === 'conversation')
        .slice(-5); // Only show the 5 most recent conversations
      
      conversationLogs.forEach((log: any) => {
        const agentName = log.agentId ? `Agent #${log.agentId}` : 'User';
        contextMessage += `- ${agentName}: ${log.message.substring(0, 100)}${log.message.length > 100 ? '...' : ''}\n`;
      });
      contextMessage += "\n";
    }
    
    if (context.allProjects && context.allProjects.length > 0) {
      contextMessage += "All current projects:\n";
      context.allProjects.forEach((project: any) => {
        const createdDate = new Date(project.createdAt).toLocaleDateString();
        const isCurrentProject = context.project && context.project.id === project.id;
        contextMessage += `- Project #${project.id}: ${project.name} (Status: ${project.status}${isCurrentProject ? ', CURRENT PROJECT' : ''})\n`;
      });
      contextMessage += "\n";
    }

    // Get completion from OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: systemMessage + (contextMessage ? `\n\nHere is some context about the current state:\n${contextMessage}` : "")
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "I couldn't generate a response.";
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * Analyzes code for issues and improvements
 */
export async function analyzeCode(
  code: string, 
  context: string = "General code review"
): Promise<{
  issues: Array<{
    type: string,
    title: string,
    description: string,
    code?: string,
    solution?: string
  }>,
  suggestions: string[]
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert code analyzer. Analyze the given code for issues, bugs, and improvement opportunities. 
          Focus on ${context}. 
          
          Respond with a JSON object containing:
          1. "issues": An array of objects, each containing:
             - "type": either "error" (for critical bugs) or "warning" (for code smells or non-critical issues)
             - "title": brief description of the issue
             - "description": detailed explanation
             - "code": the problematic code snippet (if applicable)
             - "solution": suggested fix (if applicable)
          2. "suggestions": An array of strings with general improvements, best practices, or optimizations.
          
          If the code has no issues, respond with an empty "issues" array. Always include at least one suggestion for improvement.`
        },
        { 
          role: "user", 
          content: code 
        }
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    const parsedContent = JSON.parse(content);
    
    return {
      issues: Array.isArray(parsedContent.issues) ? parsedContent.issues : [],
      suggestions: Array.isArray(parsedContent.suggestions) ? parsedContent.suggestions : []
    };
  } catch (error) {
    console.error("Code analysis error:", error);
    return { issues: [], suggestions: ["Error analyzing code: " + (error as Error).message] };
  }
}

/**
 * Generates code based on a specification
 */
export async function generateCode(
  specification: string,
  options: {
    language: string,
    framework?: string,
    existingCode?: string
  }
): Promise<string> {
  try {
    // Build the prompt based on the options
    let prompt = `Generate ${options.language} code based on this specification:\n\n${specification}\n\n`;
    
    if (options.framework) {
      prompt += `Please use the ${options.framework} framework.\n\n`;
    }
    
    if (options.existingCode) {
      prompt += `Incorporate with or extend this existing code:\n\n${options.existingCode}\n\n`;
    }
    
    prompt += "Provide only the code without explanations, comments are allowed within the code.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert ${options.language} developer${options.framework ? ` with deep knowledge of the ${options.framework} framework` : ''}. Generate clean, efficient, and well-structured code based on the specification. Include appropriate error handling, follow best practices, and optimize for readability and maintainability.`
        },
        { 
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "// Error generating code";
  } catch (error) {
    return "// Error generating code: " + (error as Error).message;
  }
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
  try {
    let prompt = `Requirements:\n${requirements}\n\nImplementation:\n${implementation}\n\n`;
    
    if (testCases && testCases.length > 0) {
      prompt += "Test Cases:\n" + testCases.join("\n") + "\n\n";
    }
    
    prompt += "Verify if the implementation meets the requirements. Respond with a JSON object.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert software tester. Verify if the implementation meets the specified requirements. Assign a score from 0-100 based on how well the implementation fulfills the requirements.
          
          Respond with a JSON object containing:
          1. "passed": boolean indicating whether the implementation passes (true if score >= 70, otherwise false)
          2. "score": number from 0-100 representing how well the implementation meets the requirements
          3. "feedback": detailed explanation of the verification results
          4. "issues": array of strings describing specific issues that need to be addressed`
        },
        { 
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    const parsedContent = JSON.parse(content);
    
    return {
      passed: !!parsedContent.passed,
      score: typeof parsedContent.score === 'number' ? parsedContent.score : 0,
      feedback: parsedContent.feedback || "No feedback provided",
      issues: Array.isArray(parsedContent.issues) ? parsedContent.issues : []
    };
  } catch (error) {
    return {
      passed: false,
      score: 0,
      feedback: "Error during verification: " + (error as Error).message,
      issues: ["Verification process failed"]
    };
  }
}