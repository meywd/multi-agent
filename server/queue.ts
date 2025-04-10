import Queue from 'bull';
import { WebSocketServer } from 'ws';
import { storage } from './storage';
import { getAgentResponse } from './openai';
import { extractTasksFromResponse } from './routes';

// For simplicity in development, use in-memory queue processing
// This will allow the queue to work without an external Redis instance
const messageQueue = new Queue('agent-messages', {
  // Default to in-memory processing if REDIS_URL is not available
  redis: process.env.REDIS_URL ? process.env.REDIS_URL : undefined
});
const taskQueue = new Queue('task-processing', {
  // Default to in-memory processing if REDIS_URL is not available
  redis: process.env.REDIS_URL ? process.env.REDIS_URL : undefined
});

// Reference to the WebSocket server for sending updates
let wss: WebSocketServer | null = null;

// Set the WebSocket server reference
export function setWebSocketServer(webSocketServer: WebSocketServer) {
  wss = webSocketServer;
}

// Broadcast a message to all connected WebSocket clients
function broadcastMessage(message: any) {
  if (!wss) {
    console.log('WebSocket server not initialized, cannot broadcast message');
    return;
  }
  
  let clientCount = 0;
  wss.clients.forEach((client: any) => {
    // Import WebSocket to get proper constants
    const WebSocket = require('ws');
    
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      clientCount++;
    }
  });
  
  console.log(`Broadcasted message of type ${message.type} to ${clientCount} clients`);
}

// Add a message to the queue for processing
export async function queueAgentMessage({
  message,
  agentId,
  projectId,
  targetAgentId,
  jobId
}: {
  message: string;
  agentId: number | null;
  projectId: number;
  targetAgentId?: number | null;
  jobId?: string;
}) {
  return messageQueue.add(
    'process-message',
    { message, agentId, projectId, targetAgentId, jobId },
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
  const { message, agentId, projectId, targetAgentId, jobId } = job.data;
  console.log(`Processing message in queue: ${message.substring(0, 50)}... (job: ${jobId || 'no-id'})`);
  
  try {
    // Notify clients that processing is starting (if jobId is provided)
    if (jobId) {
      broadcastMessage({ 
        type: 'agent_query_processing', 
        status: 'started',
        jobId,
        timestamp: new Date().toISOString()
      });
    }
    
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
        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Unknown time';
        return `[${index + 1}] ${timestamp} - ${role}:\n${log.message}`;
      })
      .join('\n\n');
    
    // Check if the message is asking to create tasks or features
    const userMessageRequestsTaskCreation = /create\s+tasks?|add\s+tasks?|make\s+tasks?|start\s+tasks?|plan\s+tasks?|break\s+down|divide\s+into\s+tasks?|what\s+tasks|identify\s+tasks?|create\s+features?|add\s+features?|make\s+features?|start\s+features?|plan\s+features?|what\s+features|identify\s+features?/i.test(message.toLowerCase());
    
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
    // This regex pattern is more comprehensive to detect various ways tasks might be described
    const responseContainsTasks = /task\s+\d+|tasks?:|\btask\b.*?:|here are the tasks|list of tasks|following tasks|we'll need to|steps to implement|break this down into|implementation steps|features?:|\bfeature\b.*?:|here are the features|list of features|following features|step\s+\d+|steps?:|\bstep\b.*?:|here are the steps|components?:|\bcomponent\b.*?:|requirements?:|\brequirement\b.*?:|stories?:|\bstory\b.*?:|work items?:|\bitem\b.*?:/i.test(response);
    
    // Always attempt to extract tasks
    const shouldExtractTasks = true;
    
    console.log(`Task extraction check: userRequesting=${userMessageRequestsTaskCreation}, responseTasks=${responseContainsTasks}, shouldExtract=${shouldExtractTasks}`);
    
    // If the message or response contains task descriptions, extract them
    if (shouldExtractTasks) {
      try {
        // Extract task information from the agent's response
        const taskExtraction = await extractTasksFromResponse(response, projectId);
        
        // Create the tasks
        for (const taskInfo of taskExtraction) {
          console.log(`Creating task from extraction: ${JSON.stringify(taskInfo)}`);
          
          try {
            // Check if this is a feature or regular task
            let task;
            if (taskInfo.isFeature) {
              console.log(`Creating FEATURE task: ${taskInfo.title}`);
              task = await storage.createFeature({
                ...taskInfo,
                projectId
              });
            } else {
              console.log(`Creating regular task: ${taskInfo.title}`);
              task = await storage.createTask({
                ...taskInfo,
                projectId
              });
            }
            
            // Create a log about task creation
            const taskLog = await storage.createLog({
              agentId: agent.id,
              projectId,
              type: 'info',
              message: `Created ${taskInfo.isFeature ? 'feature' : 'task'}: ${task.title}`,
              details: task.description
            });
            
            // Broadcast task and log creation
            broadcastMessage({ type: taskInfo.isFeature ? 'feature_created' : 'task_created', task });
            broadcastMessage({ type: 'log_created', log: taskLog });
            
            // If task is assigned to an agent, queue it for processing
            if (task.assignedTo) {
              console.log(`Task #${task.id} assigned to agent #${task.assignedTo}, queueing for processing`);
              await queueTaskProcessing({
                taskId: task.id,
                agentId: task.assignedTo
              });
            }
          } catch (taskError) {
            console.error(`Error creating task ${taskInfo.title}:`, taskError);
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
    
    // If this is a Developer/Builder agent, they could generate code and commit to GitHub
    if (agent.role === 'developer' && project && project.githubRepo) {
      try {
        // Check if we have a GitHub integration for this project
        console.log(`Developer agent working with GitHub repo: ${project.githubRepo}`);
        
        // Get the project owner's GitHub token
        const projectOwner = project.userId ? await storage.getUser(project.userId) : null;
        
        if (projectOwner && projectOwner.githubToken) {
          const { createGitHubService } = await import('./github');
          const githubService = await createGitHubService(project.userId);
          
          if (githubService.isAuthenticated()) {
            // Extract repo owner and name from the githubRepo string (format: owner/repo)
            const [owner, repo] = project.githubRepo.split('/');
            
            if (owner && repo) {
              // Generate a commit message based on the task
              const commitMessage = `Implement ${task.title} [Task #${task.id}]`;
              
              // For simplicity, let's assume we would update a README file with task details
              // In a real implementation, this would be more sophisticated with actual code generation
              await githubService.createOrUpdateFile({
                owner,
                repo,
                path: 'README.md',
                message: commitMessage,
                content: `# Task Implementation\n\n## ${task.title}\n\n${task.description || 'No description provided'}`,
                branch: project.githubBranch || 'main'
              });
              
              // Log the commit to the project
              const commitLog = await storage.createLog({
                agentId,
                projectId: project.id,
                type: 'info',
                message: `${agent.name} committed changes for task: ${task.title}`,
                details: `Commit message: ${commitMessage}\nBranch: ${project.githubBranch || 'main'}`
              });
              
              broadcastMessage({ type: 'log_created', log: commitLog });
              
              // Update the project's last commit SHA (in a real implementation)
              // await storage.updateProject(project.id, { lastCommitSha: newCommitSha });
            }
          } else {
            console.log('GitHub service not authenticated, skipping commit');
          }
        } else {
          console.log('Project owner has no GitHub token, skipping commit');
        }
      } catch (githubError) {
        console.error('Error during GitHub commit:', githubError);
        
        // Log the error but continue with task completion
        await storage.createLog({
          agentId,
          projectId: project.id,
          type: 'error',
          message: `Error committing to GitHub for task: ${task.title}`,
          details: typeof githubError === 'object' ? JSON.stringify(githubError) : String(githubError)
        });
      }
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
  
  // If this job had a jobId, notify clients that processing is complete
  if (job.data && job.data.jobId) {
    broadcastMessage({ 
      type: 'agent_query_processing', 
      status: 'completed',
      jobId: job.data.jobId,
      timestamp: new Date().toISOString()
    });
  }
});

messageQueue.on('failed', (job, err) => {
  console.error(`Message job ${job.id} failed with error:`, err);
  
  // If this job had a jobId, notify clients that processing failed
  if (job.data && job.data.jobId) {
    broadcastMessage({ 
      type: 'agent_query_processing', 
      status: 'failed',
      jobId: job.data.jobId,
      error: err.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

taskQueue.on('completed', (job, result) => {
  console.log(`Task job ${job.id} completed with result:`, result.success);
});

taskQueue.on('failed', (job, err) => {
  console.error(`Task job ${job.id} failed with error:`, err);
});

export { messageQueue, taskQueue };