import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db, pool } from "./db";
import { z } from "zod";
import { insertAgentSchema, insertTaskSchema, insertLogSchema, insertIssueSchema, insertProjectSchema, tasks, type Task } from "@shared/schema";
import { getAgentResponse, analyzeCode, generateCode, verifyImplementation } from "./openai";
import OpenAI from "openai";
import { eq } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to extract task information from agent responses
// Function to automatically process tasks assigned to agents
async function processAgentTask(task: any) { // Using any for simplicity, but represents a Task
  try {
    console.log(`Processing task #${task.id} automatically for agent #${task.assignedTo}`);
    
    // 1. Get the assigned agent
    if (!task.assignedTo) {
      console.error(`No agent assigned for task ${task.id}`);
      return;
    }
    
    const agent = await storage.getAgent(task.assignedTo);
    if (!agent) {
      console.error(`Agent ${task.assignedTo} not found for task ${task.id}`);
      return;
    }
    
    // 2. Get project information for context
    const project = task.projectId ? await storage.getProject(task.projectId) : null;
    
    // 3. Prepare prompt for the agent based on the task
    let prompt = `You are assigned to work on the following task:\n\n`;
    prompt += `Task: ${task.title}\n`;
    prompt += `Description: ${task.description || 'No description provided'}\n`;
    prompt += `Priority: ${task.priority}\n`;
    
    if (project) {
      prompt += `Project: ${project.name}\n`;
      prompt += `Project Description: ${project.description || 'No description provided'}\n`;
    }
    
    prompt += `\nPlease provide your response to this task based on your role as the ${agent.name} (${agent.role}). Include any questions, suggestions, or concerns you have.`;
    
    // 4. Get the agent's response
    const context = {
      task,
      project,
      otherTasks: project ? await storage.getTasksByProject(project.id) : [],
      recentLogs: agent ? await storage.getLogsByAgent(agent.id) : []
    };
    
    const response = await getAgentResponse(agent, prompt, context);
    
    // 5. Log the agent's response
    const log = await storage.createLog({
      agentId: agent.id,
      projectId: task.projectId,
      type: 'conversation',
      message: response,
      details: `Automatic response to task #${task.id}: ${task.title}`
    });
    
    // 6. Update task progress based on agent's role
    let newProgress = task.progress || 0;
    let newStatus = task.status;
    
    switch (agent.role) {
      case 'coordinator':  // Orchestrator
        newProgress = 30;  // Planning phase
        break;
      case 'developer':    // Builder
        newProgress = 50;  // Implementation phase
        break;
      case 'qa':           // Debugger
        newProgress = 70;  // Testing/debugging phase
        break;
      case 'tester':       // Verifier
        newProgress = 90;  // Verification phase
        break;
      case 'designer':     // UX Designer
        newProgress = 60;  // Design phase
        break;
    }
    
    // 7. Update the task progress
    if (newProgress > (task.progress || 0)) {
      await storage.updateTaskProgress(task.id, newProgress);
    }
    
    return log;
  } catch (error) {
    console.error(`Error processing task #${task.id} for agent #${task.assignedTo}:`, error);
  }
}

async function extractTasksFromResponse(response: string, projectId: number): Promise<Array<{
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  estimatedTime?: number;
  assignedTo?: number;
}>> {
  try {
    // Use OpenAI client to parse the text into structured tasks
    const parsedResponse = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model
      messages: [
        {
          role: "system",
          content: `You are a task extraction assistant integrated with our project management API. Extract tasks and features from the following text and format them for our API.

          For each task or feature, identify the following properties:
          - title (required): A clear, specific title for the task
          - description (optional): Detailed description of what needs to be done
          - priority (optional): One of "low", "medium", "high", or "critical" (default is "medium")
          - status (optional): One of "todo", "in_progress", "review", "done", "blocked" (default is "todo")
          - estimatedTime (optional): Numeric value in hours for the estimated completion time
          - assignedTo (optional): Agent ID number to assign the task to (1=Orchestrator, 2=Builder, 3=Debugger, 4=Verifier, 5=UX Designer)
          - isFeature (optional): Boolean value indicating whether this is a feature (higher-level item) rather than a regular task. Set to true for major features.
          - parentId (optional): The ID of the parent task or feature that this task belongs to, if applicable
          
          The system will automatically add the current projectId to each task/feature.
          
          Format your response as a JSON object with a 'tasks' array containing task objects. Example:
          {
            "tasks": [
              {
                "title": "User Authentication System",
                "description": "Implement complete authentication system with login/signup",
                "priority": "high",
                "status": "todo",
                "estimatedTime": 8,
                "assignedTo": 2,
                "isFeature": true
              },
              {
                "title": "Implement login form",
                "description": "Create login form with email/password fields and validation",
                "priority": "medium",
                "status": "todo",
                "estimatedTime": 2,
                "assignedTo": 2,
                "parentId": 1
              }
            ]
          }
          
          Respond with this JSON structure only, without any additional text.`
        },
        {
          role: "user",
          content: response
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });
    
    if (!parsedResponse.choices[0].message.content) {
      return [];
    }
    
    try {
      const parsedContent = JSON.parse(parsedResponse.choices[0].message.content);
      
      // Log the parsed content for debugging
      console.log("Parsed task content:", JSON.stringify(parsedContent, null, 2));
      
      if (Array.isArray(parsedContent.tasks)) {
        return parsedContent.tasks.map((task: { 
          title: string, 
          description?: string, 
          priority?: string, 
          status?: string, 
          estimatedTime?: number, 
          assignedTo?: number,
          isFeature?: boolean,
          parentId?: number
        }) => {
          // Validate and normalize values according to our schema
          const validStatuses = ["todo", "in_progress", "review", "done", "blocked"];
          const validPriorities = ["low", "medium", "high", "critical"];
          
          const normalizedStatus = task.status ? 
            (validStatuses.includes(task.status) ? task.status : "todo") : 
            "todo";
            
          const normalizedPriority = task.priority ? 
            (validPriorities.includes(task.priority) ? task.priority : "medium") : 
            "medium";
          
          return {
            title: task.title,
            description: task.description || null,
            priority: normalizedPriority,
            status: normalizedStatus,
            estimatedTime: task.estimatedTime || null,
            assignedTo: task.assignedTo || null,
            isFeature: task.isFeature || false,
            parentId: task.parentId || null,
            projectId
          };
        });
      } else {
        // Handle case where the response has tasks directly at the root
        return Array.isArray(parsedContent) ? parsedContent.map(task => ({
          ...task,
          isFeature: task.isFeature || false,
          parentId: task.parentId || null,
          projectId
        })) : [];
      }
    } catch (error) {
      console.error("Error parsing task JSON:", error);
      return [];
    }
  } catch (error) {
    console.error("Error extracting tasks:", error);
    return [];
  }
}

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  clientId?: string; // Track unique client ID
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocketClient) => {
    ws.isAlive = true;
    
    // Ping mechanism to keep connections alive
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Handle messages from clients
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        if (data.type === 'agent_status_update') {
          const agent = await storage.updateAgentStatus(data.agentId, data.status);
          broadcastMessage(wss, { type: 'agent_updated', agent });
        } else if (data.type === 'task_progress_update') {
          const task = await storage.updateTaskProgress(data.taskId, data.progress);
          broadcastMessage(wss, { type: 'task_updated', task });
        }
        
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
    
    // Handle disconnections
    ws.on('close', () => {
      ws.isAlive = false;
    });
    
    // Send initial data to client
    sendInitialData(ws);
  });
  
  // Ping all clients every 30 seconds to check if they're alive
  setInterval(() => {
    wss.clients.forEach((client) => {
      const ws = client as WebSocketClient;
      if (ws.isAlive === false) return ws.terminate();
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  // Helper function to broadcast messages to all connected clients
  function broadcastMessage(wss: WebSocketServer, message: any) {
    const messageStr = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
  
  // Helper function to send initial data to a client
  async function sendInitialData(ws: WebSocketClient) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const [agents, tasks, projects, metrics] = await Promise.all([
          storage.getAgents(),
          storage.getTasks(),
          storage.getProjects(),
          storage.getDashboardMetrics()
        ]);
        
        ws.send(JSON.stringify({ 
          type: 'initial_data',
          data: { agents, tasks, projects, metrics }
        }));
      } catch (err) {
        console.error('Error sending initial data:', err);
      }
    }
  }
  
  // API routes - prefix with /api
  
  // Get dashboard metrics
  app.get('/api/dashboard/metrics', async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching dashboard metrics' });
    }
  });
  
  
  // Agent routes
  app.get('/api/agents', async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching agents' });
    }
  });
  
  app.get('/api/agents/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agent = await storage.getAgent(id);
      
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      res.json(agent);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching agent' });
    }
  });
  
  app.post('/api/agents', async (req, res) => {
    try {
      const parsedBody = insertAgentSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: 'Invalid agent data', errors: parsedBody.error });
      }
      
      const agent = await storage.createAgent(parsedBody.data);
      res.status(201).json(agent);
      
      // Broadcast new agent to all clients
      broadcastMessage(wss, { type: 'agent_created', agent });
    } catch (err) {
      res.status(500).json({ message: 'Error creating agent' });
    }
  });
  
  app.patch('/api/agents/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }
      
      const agent = await storage.updateAgentStatus(id, status);
      
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      res.json(agent);
      
      // Broadcast agent update to all clients
      broadcastMessage(wss, { type: 'agent_updated', agent });
    } catch (err) {
      res.status(500).json({ message: 'Error updating agent status' });
    }
  });
  
  // Task routes
  app.get('/api/tasks', async (req, res) => {
    try {
      const { status, agentId } = req.query;
      
      let tasks;
      if (status) {
        tasks = await storage.getTasksByStatus(status as string);
      } else if (agentId) {
        tasks = await storage.getTasksByAgent(parseInt(agentId as string));
      } else {
        tasks = await storage.getTasks();
      }
      
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching tasks' });
    }
  });
  
  app.get('/api/tasks/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(task);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching task' });
    }
  });
  
  app.post('/api/tasks', async (req, res) => {
    try {
      const parsedBody = insertTaskSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: 'Invalid task data', errors: parsedBody.error });
      }
      
      const task = await storage.createTask(parsedBody.data);
      res.status(201).json(task);
      
      // Broadcast new task to all clients
      broadcastMessage(wss, { type: 'task_created', task });
      
      // If task status is in_progress and has assignedTo, trigger automatic processing
      if (task.status === "in_progress" && task.assignedTo) {
        console.log(`Processing task #${task.id} automatically for agent #${task.assignedTo}`);
        processAgentTask(task);
      }
    } catch (err) {
      res.status(500).json({ message: 'Error creating task' });
    }
  });
  
  // Feature endpoints
  app.get('/api/features', async (req, res) => {
    try {
      const { projectId } = req.query;
      let features;
      
      if (projectId) {
        features = await storage.getFeatures(parseInt(projectId as string));
      } else {
        features = await storage.getFeatures();
      }
      
      res.json(features);
    } catch (error) {
      console.error("Error fetching features:", error);
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });
  
  app.post('/api/features', async (req, res) => {
    try {
      const parsedBody = insertTaskSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: 'Invalid feature data', errors: parsedBody.error });
      }
      
      const feature = await storage.createFeature(parsedBody.data);
      res.status(201).json(feature);
      
      // Broadcast new feature to all clients
      broadcastMessage(wss, { type: 'feature_created', task: feature });
    } catch (error) {
      console.error("Error creating feature:", error);
      res.status(500).json({ message: "Failed to create feature" });
    }
  });
  
  // Subtask endpoints
  app.get('/api/tasks/:id/subtasks', async (req, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const subtasks = await storage.getSubtasks(parentId);
      
      res.json(subtasks);
    } catch (error) {
      console.error(`Error fetching subtasks for task ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch subtasks" });
    }
  });
  
  app.post('/api/tasks/:id/subtasks', async (req, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const taskData = { ...req.body, parentId };
      
      const parsedBody = insertTaskSchema.safeParse(taskData);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: 'Invalid subtask data', errors: parsedBody.error });
      }
      
      const subtask = await storage.createSubtask(parsedBody.data);
      res.status(201).json(subtask);
      
      // Broadcast new subtask to all clients
      broadcastMessage(wss, { type: 'subtask_created', task: subtask, parentId });
    } catch (error) {
      console.error(`Error creating subtask for task ${req.params.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create subtask";
      res.status(500).json({ message: errorMessage });
    }
  });
  
  app.patch('/api/tasks/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, progress, assignedTo } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }
      
      // First, get the current task state
      const currentTask = await storage.getTask(id);
      if (!currentTask) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Use the pool from the import at the top of the file
      
      // Just use a direct SQL query to update both fields at once
      const query = `
        UPDATE tasks 
        SET status = $1, 
            assigned_to = $2, 
            progress = $3, 
            updated_at = NOW() 
        WHERE id = $4 
        RETURNING *`;
      
      // Get the actual progress value or default to existing one
      const progressValue = progress !== undefined ? progress : (currentTask.progress || 0);
      
      // Execute the query with all parameters
      const result = await pool.query(query, [status, assignedTo, progressValue, id]);
      
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ message: 'Task not found or update failed' });
      }
      
      // Map the database column names back to camelCase for our API
      const updatedTask = {
        id: result.rows[0].id,
        projectId: result.rows[0].project_id,
        parentId: result.rows[0].parent_id,
        title: result.rows[0].title,
        description: result.rows[0].description,
        status: result.rows[0].status,
        priority: result.rows[0].priority,
        assignedTo: result.rows[0].assigned_to,
        progress: result.rows[0].progress,
        estimatedTime: result.rows[0].estimated_time,
        isFeature: result.rows[0].is_feature,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      };
      
      res.json(updatedTask);
      
      // Broadcast task update to all clients
      broadcastMessage(wss, { type: 'task_updated', task: updatedTask });
      
      // If the task was just assigned to an agent and status is in_progress, trigger automatic processing
      if (updatedTask.assignedTo && status === 'in_progress') {
        processAgentTask(updatedTask);
      }
    } catch (err) {
      console.error('Error updating task status:', err);
      res.status(500).json({ message: 'Error updating task status' });
    }
  });
  
  app.patch('/api/tasks/:id/progress', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { progress } = req.body;
      
      if (progress === undefined) {
        return res.status(400).json({ message: 'Progress is required' });
      }
      
      const task = await storage.updateTaskProgress(id, progress);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(task);
      
      // Broadcast task update to all clients
      broadcastMessage(wss, { type: 'task_updated', task });
    } catch (err) {
      res.status(500).json({ message: 'Error updating task progress' });
    }
  });
  
  // Log routes
  app.get('/api/logs', async (req, res) => {
    try {
      const { agentId, projectId, type } = req.query;
      
      let logs;
      if (agentId) {
        logs = await storage.getLogsByAgent(parseInt(agentId as string));
      } else if (projectId) {
        logs = await storage.getLogsByProject(parseInt(projectId as string));
      } else if (type === 'conversation') {
        logs = await storage.getConversationLogs();
      } else {
        logs = await storage.getLogs();
      }
      
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching logs' });
    }
  });
  
  // Get conversation logs by project
  app.get('/api/projects/:id/conversations', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const logs = await storage.getConversationLogs(projectId);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching project conversations' });
    }
  });
  
  app.post('/api/logs', async (req, res) => {
    try {
      const parsedBody = insertLogSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: 'Invalid log data', errors: parsedBody.error });
      }
      
      const log = await storage.createLog(parsedBody.data);
      res.status(201).json(log);
      
      // Broadcast new log to all clients
      broadcastMessage(wss, { type: 'log_created', log });
    } catch (err) {
      res.status(500).json({ message: 'Error creating log' });
    }
  });
  
  // Issue routes
  app.get('/api/issues', async (req, res) => {
    try {
      const { taskId, resolved } = req.query;
      
      let issues;
      if (taskId) {
        issues = await storage.getIssuesByTask(parseInt(taskId as string));
      } else if (resolved === 'false') {
        issues = await storage.getUnresolvedIssues();
      } else {
        issues = await storage.getIssues();
      }
      
      res.json(issues);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching issues' });
    }
  });
  
  app.post('/api/issues', async (req, res) => {
    try {
      const parsedBody = insertIssueSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: 'Invalid issue data', errors: parsedBody.error });
      }
      
      const issue = await storage.createIssue(parsedBody.data);
      res.status(201).json(issue);
      
      // Broadcast new issue to all clients
      broadcastMessage(wss, { type: 'issue_created', issue });
    } catch (err) {
      res.status(500).json({ message: 'Error creating issue' });
    }
  });
  
  app.patch('/api/issues/:id/resolve', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const issue = await storage.resolveIssue(id);
      
      if (!issue) {
        return res.status(404).json({ message: 'Issue not found' });
      }
      
      res.json(issue);
      
      // Broadcast issue update to all clients
      broadcastMessage(wss, { type: 'issue_updated', issue });
    } catch (err) {
      res.status(500).json({ message: 'Error resolving issue' });
    }
  });

  // AI Agent API endpoints
  app.post('/api/agents/:id/query', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const { prompt, includeContext = true } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      
      const agent = await storage.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      // Gather context if requested
      let context = {};
      if (includeContext) {
        const [recentLogs, relatedTasks, relatedIssues, projects] = await Promise.all([
          storage.getLogsByAgent(agentId),
          storage.getTasksByAgent(agentId),
          storage.getIssues(), // Filter relevant issues in the frontend
          storage.getProjects() // Include all projects
        ]);
        
        context = {
          recentLogs: recentLogs.slice(0, 10), // Last 10 logs
          relatedTasks,
          relatedIssues,
          allProjects: projects // Add all projects to context
        };
      }
      
      const response = await getAgentResponse(agent, prompt, context);
      
      // Log this interaction
      const log = await storage.createLog({
        agentId,
        type: 'info',
        message: `Processed query: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`,
        details: `Query: ${prompt}\n\nResponse: ${response.substring(0, 500)}${response.length > 500 ? '...' : ''}`
      });
      
      // Broadcast new log to all clients
      broadcastMessage(wss, { type: 'log_created', log });
      
      res.json({ response });
    } catch (err) {
      console.error('Error processing agent query:', err);
      res.status(500).json({ message: 'Error processing agent query' });
    }
  });

  app.post('/api/code/analyze', async (req, res) => {
    try {
      const { code, context } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: 'Code is required' });
      }
      
      const analysis = await analyzeCode(code, context || 'General code review');
      
      // Create issues based on analysis
      const createdIssues = [];
      
      for (const issue of analysis.issues) {
        // Here we're making assumptions about taskId.
        // In a real system, you'd want this to be provided in the request.
        const createdIssue = await storage.createIssue({
          taskId: 1, // Default to first task for demo
          type: issue.type,
          title: issue.title,
          description: issue.description,
          code: issue.code,
          solution: issue.solution
        });
        
        createdIssues.push(createdIssue);
        
        // Broadcast new issue to all clients
        broadcastMessage(wss, { type: 'issue_created', issue: createdIssue });
      }
      
      res.json({
        issues: createdIssues,
        suggestions: analysis.suggestions
      });
    } catch (err) {
      console.error('Error analyzing code:', err);
      res.status(500).json({ message: 'Error analyzing code' });
    }
  });

  app.post('/api/code/generate', async (req, res) => {
    try {
      const { specification, language, framework, existingCode } = req.body;
      
      if (!specification || !language) {
        return res.status(400).json({ 
          message: 'Specification and language are required' 
        });
      }
      
      const code = await generateCode(specification, {
        language,
        framework,
        existingCode
      });
      
      res.json({ code });
    } catch (err) {
      console.error('Error generating code:', err);
      res.status(500).json({ message: 'Error generating code' });
    }
  });

  app.post('/api/code/verify', async (req, res) => {
    try {
      const { requirements, implementation, testCases } = req.body;
      
      if (!requirements || !implementation) {
        return res.status(400).json({ 
          message: 'Requirements and implementation are required' 
        });
      }
      
      const verification = await verifyImplementation(
        requirements,
        implementation,
        testCases
      );
      
      res.json(verification);
    } catch (err) {
      console.error('Error verifying implementation:', err);
      res.status(500).json({ message: 'Error verifying implementation' });
    }
  });

  // Project routes
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching projects' });
    }
  });
  
  app.get('/api/projects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching project' });
    }
  });
  
  app.post('/api/projects', async (req, res) => {
    try {
      const parsedBody = insertProjectSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: 'Invalid project data', errors: parsedBody.error });
      }
      
      const project = await storage.createProject(parsedBody.data);
      
      // Have the orchestrator agent (ID 1) start a conversation about the new project
      try {
        const orchestratorAgent = await storage.getAgent(1);
        
        if (orchestratorAgent) {
          // Create a conversation log from the orchestrator
          const message = `I notice we have a new project: "${project.name}". Could you tell me more about this project and what you'd like to accomplish? I can help break it down into tasks and coordinate our team's efforts.`;
          
          const conversationLog = await storage.createLog({
            agentId: orchestratorAgent.id,
            projectId: project.id,
            type: 'conversation',
            message: message,
            details: `The Orchestrator is initiating a conversation about the newly created project: ${project.name}`
          });
          
          // Broadcast the new log
          broadcastMessage(wss, { type: 'log_created', log: conversationLog });
        }
      } catch (error) {
        console.error('Error creating initial conversation:', error);
        // Non-blocking error - we still want to return the created project
      }
      
      res.status(201).json(project);
      
      // Broadcast new project to all clients
      broadcastMessage(wss, { type: 'project_created', project });
    } catch (err) {
      res.status(500).json({ message: 'Error creating project' });
    }
  });
  
  app.patch('/api/projects/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }
      
      const project = await storage.updateProjectStatus(id, status);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      res.json(project);
      
      // Broadcast project update to all clients
      broadcastMessage(wss, { type: 'project_updated', project });
    } catch (err) {
      res.status(500).json({ message: 'Error updating project status' });
    }
  });
  
  app.get('/api/projects/:id/tasks', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tasks = await storage.getTasksByProject(id);
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching project tasks' });
    }
  });
  
  // Delete a project and all related data (tasks, logs, issues)
  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if project exists
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Delete the project and all associated data
      const success = await storage.deleteProject(id);
      
      if (success) {
        // Broadcast project deletion to all clients
        broadcastMessage(wss, { type: 'project_deleted', projectId: id });
        return res.status(200).json({ message: 'Project and all related data deleted successfully' });
      } else {
        return res.status(500).json({ message: 'Failed to delete project' });
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      res.status(500).json({ message: 'Error deleting project' });
    }
  });
  
  // GitHub integration endpoints
  
  // Link a GitHub repository to a project
  app.post('/api/projects/:id/github', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID format' });
      }
      
      const { repository, branch } = req.body;
      
      if (!repository) {
        return res.status(400).json({ error: 'Repository name is required' });
      }
      
      // Verify repository format (owner/repo)
      if (!repository.includes('/')) {
        return res.status(400).json({ 
          error: 'Invalid repository format. Please use the format owner/repository'
        });
      }
      
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: `Project with ID ${projectId} not found` });
      }
      
      // Check if the user owns the project
      if (project.userId && project.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this project' });
      }
      
      // Create GitHub service with user's token
      const { createGitHubService } = await import('./github');
      const githubService = await createGitHubService(req.user.id);
      
      if (!githubService.isAuthenticated()) {
        return res.status(401).json({ 
          error: 'GitHub token not configured or invalid. Please add your GitHub token in your profile.'
        });
      }
      
      // Verify repository exists and is accessible
      try {
        const [owner, repo] = repository.split('/');
        await githubService.getRepository(owner, repo);
      } catch (githubError) {
        return res.status(400).json({ 
          error: `GitHub repository error: ${githubError.message || 'Repository not found or not accessible'}`
        });
      }
      
      // Update project with GitHub information
      const updatedProject = await db
        .update(projects)
        .set({ 
          githubRepo: repository,
          githubBranch: branch || 'main',
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId))
        .returning();
      
      // Broadcast project update
      broadcastMessage(wss, { 
        type: 'project_updated', 
        project: updatedProject[0]
      });
      
      res.status(200).json(updatedProject[0]);
    } catch (error) {
      console.error('Error linking GitHub repository:', error);
      res.status(500).json({ error: 'Failed to link GitHub repository' });
    }
  });
  
  // Get repository content
  app.get('/api/projects/:id/github/content', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID format' });
      }
      
      const { path } = req.query;
      
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: `Project with ID ${projectId} not found` });
      }
      
      // Check if GitHub repository is linked
      if (!project.githubRepo) {
        return res.status(400).json({ error: 'No GitHub repository linked to this project' });
      }
      
      // Check if the user has access to the project
      if (project.userId && project.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access this project' });
      }
      
      // Create GitHub service with user's token
      const { createGitHubService } = await import('./github');
      const githubService = await createGitHubService(req.user.id);
      
      if (!githubService.isAuthenticated()) {
        return res.status(401).json({ 
          error: 'GitHub token not configured or invalid. Please add your GitHub token in your profile.'
        });
      }
      
      // Get repository content
      const [owner, repo] = project.githubRepo.split('/');
      const content = await githubService.getFileContent(
        owner, 
        repo, 
        path?.toString() || '',
        project.githubBranch || 'main'
      );
      
      res.status(200).json(content);
    } catch (error) {
      console.error('Error fetching GitHub content:', error);
      res.status(500).json({ error: 'Failed to fetch GitHub content' });
    }
  });
  
  // Commit file to repository
  app.post('/api/projects/:id/github/commit', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID format' });
      }
      
      const { path, content, message, sha } = req.body;
      
      if (!path || !content) {
        return res.status(400).json({ error: 'Path and content are required' });
      }
      
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: `Project with ID ${projectId} not found` });
      }
      
      // Check if GitHub repository is linked
      if (!project.githubRepo) {
        return res.status(400).json({ error: 'No GitHub repository linked to this project' });
      }
      
      // Check if the user has access to the project
      if (project.userId && project.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to modify this project' });
      }
      
      // Create GitHub service with user's token
      const { createGitHubService } = await import('./github');
      const githubService = await createGitHubService(req.user.id);
      
      if (!githubService.isAuthenticated()) {
        return res.status(401).json({ 
          error: 'GitHub token not configured or invalid. Please add your GitHub token in your profile.'
        });
      }
      
      // Commit the file
      const [owner, repo] = project.githubRepo.split('/');
      const commitMessage = message || `Update ${path}`;
      const result = await githubService.createOrUpdateFile(
        owner,
        repo,
        path,
        content,
        commitMessage,
        project.githubBranch || 'main',
        sha
      );
      
      // Update last commit SHA
      await db
        .update(projects)
        .set({ lastCommitSha: result.commit.sha })
        .where(eq(projects.id, projectId));
      
      // Log the file change
      await storage.createLog({
        message: `File ${path} committed to GitHub repository`,
        type: 'info',
        projectId,
        details: JSON.stringify({
          file: path,
          message: commitMessage,
          sha: result.commit.sha
        })
      });
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error committing to GitHub:', error);
      res.status(500).json({ error: 'Failed to commit to GitHub: ' + error.message });
    }
  });
  
  // Create multiple file commit
  app.post('/api/projects/:id/github/commit-batch', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID format' });
      }
      
      const { files, message } = req.body;
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Files array is required' });
      }
      
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: `Project with ID ${projectId} not found` });
      }
      
      // Check if GitHub repository is linked
      if (!project.githubRepo) {
        return res.status(400).json({ error: 'No GitHub repository linked to this project' });
      }
      
      // Check if the user has access to the project
      if (project.userId && project.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to modify this project' });
      }
      
      // Create GitHub service with user's token
      const { createGitHubService } = await import('./github');
      const githubService = await createGitHubService(req.user.id);
      
      if (!githubService.isAuthenticated()) {
        return res.status(401).json({ 
          error: 'GitHub token not configured or invalid. Please add your GitHub token in your profile.'
        });
      }
      
      // Create batch commit
      const [owner, repo] = project.githubRepo.split('/');
      const commitMessage = message || `Multi-file update`;
      
      const result = await githubService.createCommit(
        owner,
        repo,
        project.githubBranch || 'main',
        commitMessage,
        files
      );
      
      // Update last commit SHA
      await db
        .update(projects)
        .set({ lastCommitSha: result.sha })
        .where(eq(projects.id, projectId));
      
      // Log the batch change
      await storage.createLog({
        message: `Batch commit of ${files.length} files to GitHub repository`,
        type: 'info',
        projectId,
        details: JSON.stringify({
          fileCount: files.length,
          fileNames: files.map(f => f.path),
          message: commitMessage,
          sha: result.sha
        })
      });
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error creating batch commit to GitHub:', error);
      res.status(500).json({ error: 'Failed to create batch commit: ' + error.message });
    }
  });
  
  // Add endpoint for responding to agent conversations
  app.post('/api/projects/:id/respond', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { message, agentId } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }
      
      // Validate project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Create a user response log (no agentId, which indicates it's from the user)
      const responseLog = await storage.createLog({
        agentId: null,
        targetAgentId: agentId || null, // Target the specific agent if provided
        projectId,
        type: 'conversation',
        message,
        details: null
      });
      
      // Broadcast the new log
      broadcastMessage(wss, { type: 'log_created', log: responseLog });
      
      // Get all agents and select an appropriate responder
      let respondingAgentId = agentId;
      
      if (!respondingAgentId) {
        // If no agent was specified, find an appropriate one based on the message content
        const agents = await storage.getAgents();
        
        // Determine appropriate agent based on message content and project state
        // Default to orchestrator for new projects or general queries
        const messageLC = message.toLowerCase();
        
        // Check which phase of development the message seems to be about
        if (messageLC.includes('bug') || messageLC.includes('error') || messageLC.includes('fix') || 
            messageLC.includes('issue') || messageLC.includes('debug')) {
          // Debugging related - assign to debugger (qa role)
          const debuggerAgent = agents.find(a => a.role === 'qa');
          if (debuggerAgent) respondingAgentId = debuggerAgent.id;
        } else if (messageLC.includes('test') || messageLC.includes('verify') || 
                   messageLC.includes('validation') || messageLC.includes('check if')) {
          // Testing/verification related - assign to verifier (tester role)
          const verifier = agents.find(a => a.role === 'tester');
          if (verifier) respondingAgentId = verifier.id;
        } else if (messageLC.includes('design') || messageLC.includes('ui') || 
                   messageLC.includes('ux') || messageLC.includes('user experience') || 
                   messageLC.includes('interface') || messageLC.includes('layout')) {
          // UX/UI related - assign to builder since we don't have a specific designer
          const designer = agents.find(a => a.role === 'developer');
          if (designer) respondingAgentId = designer.id;
        } else if (messageLC.includes('implement') || messageLC.includes('code') || 
                  messageLC.includes('build') || messageLC.includes('develop') || 
                  messageLC.includes('create feature')) {
          // Implementation related - assign to builder (developer role)
          const builder = agents.find(a => a.role === 'developer');
          if (builder) respondingAgentId = builder.id;
        } else {
          // Default to orchestrator for planning and general queries
          const orchestrator = agents.find(a => a.role === 'coordinator');
          if (orchestrator) respondingAgentId = orchestrator.id;
          
          // If orchestrator not found, just take the first agent
          if (!orchestrator && agents.length > 0) {
            respondingAgentId = agents[0].id;
          }
        }
      }
      
      // Now, have the agent respond
      if (respondingAgentId) {
        try {
          const agent = await storage.getAgent(respondingAgentId);
          
          // In project view (when no specific agentId is targeted), only Orchestrator (coordinator) should respond to messages
          // If it's a direct agent message (has agentId) then any agent can respond
          if (agent && (agentId === null && agent.role !== 'coordinator')) {
            console.log(`Agent #${agent.id} has role ${agent.role} but only coordinator can respond in project view. Skipping.`);
          } else if (agent) {
            console.log(`Agent #${agent.id} (${agent.role}) responding to message in project #${projectId}`);
            
            // Get project tasks for context
            const projectTasks = await storage.getTasksByProject(projectId);
            
            // Get all agents for accurate name/role mapping in conversation history
            const allAgents = await storage.getAgents();
            
            // Get the recent conversation logs for context (up to 10 most recent)
            const recentConversations = await storage.getConversationLogs(projectId);
            
            // Format the conversation history
            const conversationHistory = recentConversations
              .filter(log => log.type === 'conversation')
              .slice(-10) // Get the 10 most recent logs
              .map((log, index) => {
                // Get the agent's name and role if this is an agent message
                let role = 'User';
                if (log.agentId) {
                  const agentDetails = allAgents.find((a: any) => a.id === log.agentId);
                  role = agentDetails 
                    ? `Agent ${agentDetails.name} (${agentDetails.role})`
                    : `Agent #${log.agentId}`;
                }
                // Format the message with a timestamp and sequence number
                const timestamp = typeof log.timestamp === 'string' || typeof log.timestamp === 'number' || log.timestamp instanceof Date
                  ? new Date(log.timestamp).toLocaleTimeString() 
                  : new Date().toLocaleTimeString();
                return `[${index + 1}] ${timestamp} - ${role}:\n${log.message}`;
              })
              .join('\n\n');
            
            // Check if the message is asking to create tasks or features
            const createTasksRequestRegex = /create\s+tasks?|add\s+tasks?|make\s+tasks?|start\s+tasks?|plan\s+tasks?|break\s+down|divide\s+into\s+tasks?|what\s+tasks|identify\s+tasks?|create\s+features?|add\s+features?|make\s+features?|start\s+features?|plan\s+features?|what\s+features|identify\s+features?/i;
            const isRequestingTasks = createTasksRequestRegex.test(message.toLowerCase());
            
            // Generate an agent response based on the message
            const response = await getAgentResponse(agent, message, {
              project,
              allProjects: await storage.getProjects(),
              relatedTasks: projectTasks,
              conversationHistory,
              recentLogs: await storage.getLogsByProject(projectId)
            });
            
            // Create a conversation log from the agent
            const agentResponseLog = await storage.createLog({
              agentId: agent.id,
              projectId,
              type: 'conversation',
              message: response,
              details: null
            });
            
            // Broadcast the new log
            broadcastMessage(wss, { type: 'log_created', log: agentResponseLog });
            
            // Check if the response appears to contain tasks or features
            const responseContainsTasks = /task\s+\d+|tasks?:|\btask\b.*?:|here are the tasks|list of tasks|following tasks|we'll need to|steps to implement|break this down into|implementation steps|features?:|\bfeature\b.*?:|here are the features|list of features|following features/i.test(response);
            
            // We'll extract tasks if:
            // 1. User explicitly asked for tasks creation, or
            // 2. The agent's response appears to contain task descriptions
            // Now allowing all agent types to create tasks/features
            const shouldExtractTasks = isRequestingTasks || responseContainsTasks;
            
            console.log(`Task extraction check: requestingTasks=${isRequestingTasks}, responseTasks=${responseContainsTasks}, shouldExtract=${shouldExtractTasks}`);
            
            // If the message or response contains task descriptions, extract them
            if (shouldExtractTasks) {
              try {
                // Extract task information from the agent's response
                const taskExtraction = await extractTasksFromResponse(response, projectId);
                
                // Create the tasks
                for (const taskInfo of taskExtraction) {
                  const task = await storage.createTask({
                    ...taskInfo,
                    projectId
                  });
                  
                  // Create a log about task creation
                  await storage.createLog({
                    agentId: agent.id,
                    projectId,
                    type: 'info',
                    message: `Created task: ${task.title}`,
                    details: task.description
                  });
                  
                  // Broadcast task creation
                  broadcastMessage(wss, { type: 'task_created', task });
                }
                
                console.log(`Created ${taskExtraction.length} tasks for project ${projectId}`);
              } catch (error) {
                console.error('Error extracting tasks from response:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error creating agent response:', error);
          // Non-blocking error - we still want to return the user's response
        }
      }
      
      res.status(201).json(responseLog);
    } catch (err) {
      console.error('Error responding to conversation:', err);
      res.status(500).json({ message: 'Error responding to conversation' });
    }
  });

  return httpServer;
}
