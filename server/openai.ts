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
    
    switch (agent.role) {
      case "coordinator":
        systemMessage = `You are an AI Coordinator Agent named ${agent.name}. Your role is to manage and prioritize tasks, coordinate between other agents, and provide high-level oversight of the development process. Be concise, clear, and focused on organization and prioritization.`;
        break;
      case "developer":
        systemMessage = `You are an AI Developer Agent named ${agent.name}. Your role is to write high-quality code, implement features, and find elegant solutions to technical problems. Focus on code quality, performance, and following best practices.`;
        break;
      case "qa":
        systemMessage = `You are an AI QA Agent named ${agent.name}. Your role is to review code for bugs, edge cases, and potential issues. You analyze code critically and suggest improvements for reliability and robustness.`;
        break;
      case "tester":
        systemMessage = `You are an AI Tester Agent named ${agent.name}. Your role is to verify that implementations match specifications, design test cases, and ensure quality across the system. You think methodically about different scenarios and edge cases.`;
        break;
      default:
        systemMessage = `You are an AI Agent named ${agent.name}. ${agent.description || "Your role is to assist with software development tasks."}`;
    }
    
    // Add context information if available
    let contextMessage = "";
    if (context.recentLogs && context.recentLogs.length > 0) {
      contextMessage += "Recent activity logs:\n";
      context.recentLogs.forEach((log: any) => {
        contextMessage += `- ${new Date(log.timestamp).toLocaleString()}: ${log.message}\n`;
      });
      contextMessage += "\n";
    }
    
    if (context.relatedTasks && context.relatedTasks.length > 0) {
      contextMessage += "Current tasks:\n";
      context.relatedTasks.forEach((task: any) => {
        contextMessage += `- Task #${task.id}: ${task.title} (${task.status}, ${task.progress}% complete)\n`;
      });
      contextMessage += "\n";
    }
    
    if (context.allProjects && context.allProjects.length > 0) {
      contextMessage += "Current projects:\n";
      context.allProjects.forEach((project: any) => {
        const createdDate = new Date(project.createdAt).toLocaleDateString();
        contextMessage += `- Project #${project.id}: ${project.name} (Status: ${project.status}, Created: ${createdDate})\n`;
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