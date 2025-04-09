import Queue from 'bull';
import { WebSocketServer } from 'ws';
import { storage } from './storage';
import { getAgentResponse } from './openai';
import { extractTasksFromResponse } from './routes';

// Redis connection is automatically handled by Bull using the DATABASE_URL
const messageQueue = new Queue('agent-messages', process.env.DATABASE_URL);
const taskQueue = new Queue('task-processing', process.env.DATABASE_URL);

// Reference to the WebSocket server for sending updates
let wss: WebSocketServer | null = null;

// Set the WebSocket server reference
export function setWebSocketServer(webSocketServer: WebSocketServer) {
  wss = webSocketServer;
}

// Broadcast a message to all connected WebSocket clients
function broadcastMessage(message: any) {
  if (!wss) return;
  
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(message));
    }
  });
}

// Add a message to the queue for processing
export async function queueAgentMessage({
  message,
  agentId,
  projectId,
  targetAgentId
}: {
  message: string;
  agentId: number | null;
  projectId: number;
  targetAgentId?: number | null;
}) {
  return messageQueue.add(
    'process-message',
    { message, agentId, projectId, targetAgentId },
    { 
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    }
  );
}

// Add a task to the queue for processing by an agent
export async function queueTaskProcessing({
  taskId,
  agentId
}: {
  taskId: number;
  agentId: number;
}) {
  return taskQueue.add(
    'process-task',
    { taskId, agentId },
    {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000
      }
    }
  );
}

// Process agent messages
messageQueue.process('process-message', async (job) => {
  const { message, agentId, projectId, targetAgentId } = job.data;
  console.log(`Processing message in queue: ${message.substring(0, 50)}...`);
  
  try {
    // Validate project exists
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    // Determine which agent should respond
    let respondingAgentId = targetAgentId;
    if (!respondingAgentId) {
      // If no specific target, default to Orchestrator in project view
      const orchestratorAgent = (await storage.getAgents())
        .find(agent => agent.role === 'coordinator');
      
      if (orchestratorAgent) {
        respondingAgentId = orchestratorAgent.id;
      } else {
        throw new Error('No orchestrator agent found to respond');
      }
    }
    
    // Get the responding agent
    const agent = await storage.getAgent(respondingAgentId);
    if (!agent) {
      throw new Error(`Responding agent not found: ${respondingAgentId}`);
    }
    
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
          const agentDetails = allAgents.find((a) => a.id === log.agentId);
          role = agentDetails 
            ? `Agent ${agentDetails.name} (${agentDetails.role})`
            : `Agent #${log.agentId}`;
        }
        // Format the message with a timestamp and sequence number
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
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
    broadcastMessage({ type: 'log_created', log: agentResponseLog });
    
    // Check if the response appears to contain tasks or features
    const responseContainsTasks = /task\s+\d+|tasks?:|\btask\b.*?:|here are the tasks|list of tasks|following tasks|we'll need to|steps to implement|break this down into|implementation steps|features?:|\bfeature\b.*?:|here are the features|list of features|following features/i.test(response);
    
    // We'll extract tasks if:
    // 1. User explicitly asked for tasks creation, or
    // 2. The agent's response appears to contain task descriptions
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
          broadcastMessage({ type: 'task_created', task });
          
          // If task is assigned to an agent, queue it for processing
          if (task.assignedTo) {
            await queueTaskProcessing({
              taskId: task.id,
              agentId: task.assignedTo
            });
          }
        }
        
        console.log(`Created ${taskExtraction.length} tasks for project ${projectId}`);
      } catch (error) {
        console.error('Error extracting tasks from response:', error);
      }
    }
    
    return { success: true, agentResponseLog };
  } catch (error) {
    console.error('Error processing message in queue:', error);
    return { success: false, error: error.message };
  }
});

// Process task queue (agent working on a task)
taskQueue.process('process-task', async (job) => {
  const { taskId, agentId } = job.data;
  console.log(`Processing task #${taskId} by agent #${agentId}`);
  
  try {
    const task = await storage.getTask(taskId);
    const agent = await storage.getAgent(agentId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Update task status to in progress
    const updatedTask = await storage.updateTaskStatus(taskId, 'in_progress');
    broadcastMessage({ type: 'task_updated', task: updatedTask });
    
    // Log that the agent has started working on the task
    const startLog = await storage.createLog({
      agentId,
      projectId: task.projectId,
      type: 'info',
      message: `${agent.name} started working on task: ${task.title}`,
      details: null
    });
    
    broadcastMessage({ type: 'log_created', log: startLog });
    
    // Get task context (project, related tasks, etc)
    const project = task.projectId ? await storage.getProject(task.projectId) : null;
    const projectTasks = task.projectId ? await storage.getTasksByProject(task.projectId) : [];
    
    // For subtasks, get the parent task
    let parentTask = null;
    if (task.parentId) {
      parentTask = await storage.getTask(task.parentId);
    }
    
    // Generate a response from the agent about working on this task
    const workResponse = await getAgentResponse(agent, `I need to work on the task: ${task.title}. ${task.description}`, {
      project,
      task,
      parentTask,
      relatedTasks: projectTasks,
    });
    
    // Create a progress log
    const progressLog = await storage.createLog({
      agentId,
      projectId: task.projectId,
      type: 'conversation',
      message: workResponse,
      details: null
    });
    
    broadcastMessage({ type: 'log_created', log: progressLog });
    
    // Update task progress
    const progressTask = await storage.updateTaskProgress(taskId, 50);
    broadcastMessage({ type: 'task_updated', task: progressTask });
    
    // If this is a Developer/Builder agent, they could generate code
    if (agent.role === 'developer') {
      // This would integrate with future code generation/GitHub functionality
    }
    
    // Complete the task after processing
    const completedTask = await storage.updateTaskStatus(taskId, 'completed', 100);
    broadcastMessage({ type: 'task_updated', task: completedTask });
    
    // Create a completion log
    const completionLog = await storage.createLog({
      agentId,
      projectId: task.projectId,
      type: 'info',
      message: `${agent.name} completed task: ${task.title}`,
      details: null
    });
    
    broadcastMessage({ type: 'log_created', log: completionLog });
    
    return { success: true, taskId, status: 'completed' };
  } catch (error) {
    console.error('Error processing task in queue:', error);
    
    // Log the error
    try {
      const task = await storage.getTask(taskId);
      if (task && task.projectId) {
        await storage.createLog({
          agentId,
          projectId: task.projectId,
          type: 'error',
          message: `Error processing task #${taskId}: ${error.message}`,
          details: error.stack
        });
      }
    } catch (logError) {
      console.error('Error creating error log:', logError);
    }
    
    return { success: false, error: error.message };
  }
});

// Listen for queue events
messageQueue.on('completed', (job, result) => {
  console.log(`Message job ${job.id} completed with result:`, result.success);
});

messageQueue.on('failed', (job, err) => {
  console.error(`Message job ${job.id} failed with error:`, err);
});

taskQueue.on('completed', (job, result) => {
  console.log(`Task job ${job.id} completed with result:`, result.success);
});

taskQueue.on('failed', (job, err) => {
  console.error(`Task job ${job.id} failed with error:`, err);
});

export { messageQueue, taskQueue };