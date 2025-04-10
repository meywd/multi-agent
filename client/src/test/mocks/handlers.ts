import { http, HttpResponse } from 'msw';

// Mock user data
const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  githubUsername: null
};

// Define handlers for API endpoints
export const handlers = [
  // User authentication
  http.get('/api/user', () => {
    return HttpResponse.json(mockUser);
  }),
  
  http.post('/api/login', async ({ request }) => {
    const data = await request.json();
    
    if (data.username === 'testuser' && data.password === 'password123') {
      return HttpResponse.json(mockUser);
    }
    
    return new HttpResponse(null, {
      status: 401,
      statusText: 'Authentication failed'
    });
  }),
  
  http.post('/api/register', async ({ request }) => {
    const data = await request.json();
    
    if (!data.username || !data.password) {
      return new HttpResponse(null, {
        status: 400,
        statusText: 'Username and password are required'
      });
    }
    
    return HttpResponse.json({
      ...mockUser,
      username: data.username,
      email: data.email || null,
      fullName: data.fullName || null
    }, { status: 201 });
  }),
  
  http.post('/api/logout', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  
  // Agents
  http.get('/api/agents', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Orchestrator',
        role: 'coordinator',
        status: 'online',
        description: 'Plans and coordinates tasks',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Builder',
        role: 'developer',
        status: 'online',
        description: 'Implements code and features',
        createdAt: new Date().toISOString()
      }
    ]);
  }),
  
  // Projects
  http.get('/api/projects', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Project',
        description: 'A test project for development',
        status: 'active',
        userId: 1,
        githubRepo: null,
        githubBranch: null,
        lastCommitSha: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      }
    ]);
  }),
  
  // Tasks
  http.get('/api/tasks', () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Implement Authentication',
        description: 'Set up user registration and login',
        status: 'completed',
        priority: 'high',
        assignedTo: 2,
        projectId: 1,
        progress: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  }),
  
  // Dashboard metrics
  http.get('/api/dashboard/metrics', () => {
    return HttpResponse.json({
      activeAgents: 2,
      totalAgents: 5,
      tasksInQueue: 3,
      completedTasks: 7,
      issuesDetected: 2,
      criticalIssues: 0,
      warningIssues: 2,
      verificationRate: 95
    });
  })
];