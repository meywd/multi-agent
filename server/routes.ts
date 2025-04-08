import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertAgentSchema, insertTaskSchema, insertLogSchema, insertIssueSchema, insertProjectSchema } from "@shared/schema";
import { getAgentResponse, analyzeCode, generateCode, verifyImplementation } from "./openai";

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
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
    } catch (err) {
      res.status(500).json({ message: 'Error creating task' });
    }
  });
  
  app.patch('/api/tasks/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, progress } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }
      
      const task = await storage.updateTaskStatus(id, status, progress);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(task);
      
      // Broadcast task update to all clients
      broadcastMessage(wss, { type: 'task_updated', task });
    } catch (err) {
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
      const { agentId } = req.query;
      
      let logs;
      if (agentId) {
        logs = await storage.getLogsByAgent(parseInt(agentId as string));
      } else {
        logs = await storage.getLogs();
      }
      
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching logs' });
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
        const [recentLogs, relatedTasks, relatedIssues] = await Promise.all([
          storage.getLogsByAgent(agentId),
          storage.getTasksByAgent(agentId),
          storage.getIssues() // Filter relevant issues in the frontend
        ]);
        
        context = {
          recentLogs: recentLogs.slice(0, 10), // Last 10 logs
          relatedTasks,
          relatedIssues
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

  return httpServer;
}
