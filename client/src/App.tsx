import { Route, Switch, useLocation } from "wouter";
import Dashboard from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import FeaturesPage from "@/pages/features";
import FeatureDetailPage from "@/pages/feature-detail";
import TaskDetailPage from "@/pages/task-detail";
import PlaygroundPage from "@/pages/playground";
import AgentsPage from "@/pages/agents";
import TasksPage from "@/pages/tasks";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import YouTubeFeatures from "@/pages/youtube-features";
import Analytics from "@/pages/analytics";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useState, useEffect, useRef } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Toaster } from "@/components/ui/toaster";
import { CookieConsentProvider } from "@/context/cookie-consent-context";
import { CookieConsent } from "@/components/CookieConsent";
import { createWebSocketConnection } from "@/lib/websocket";
import { WebSocketMessage } from "@/lib/types";
import { pendingAgentQueries } from "@/lib/aiService";
import { useToast } from "@/hooks/use-toast";

function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const [location] = useLocation();
  
  // If we're at the auth page, don't render the main layout
  if (location === '/auth') {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  return (
    <MainLayout>
      <Switch>
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/projects" component={ProjectsPage} />
        <ProtectedRoute path="/projects/:id" component={ProjectDetailPage} />
        <ProtectedRoute path="/projects/:id/youtube-features" component={YouTubeFeatures} />
        <ProtectedRoute path="/features" component={FeaturesPage} />
        <ProtectedRoute path="/features/:id" component={FeatureDetailPage} />
        <ProtectedRoute path="/tasks/:id" component={TaskDetailPage} />
        <ProtectedRoute path="/agents" component={AgentsPage} />
        <ProtectedRoute path="/tasks" component={TasksPage} />
        <ProtectedRoute path="/analytics" component={Analytics} />
        <ProtectedRoute path="/playground" component={PlaygroundPage} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Set up WebSocket connection
  useEffect(() => {
    // Handle WebSocket messages
    const handleMessage = (message: WebSocketMessage) => {
      console.log("WebSocket message received:", message);
      
      // Handle different message types
      switch(message.type) {
        case 'agent_query_completed':
          handleAgentQueryCompleted(message);
          break;
        case 'agent_query_error':
          handleAgentQueryError(message);
          break;
        case 'agent_query_processing':
          console.log("Agent query processing:", message.jobId);
          break;
        case 'log_created':
          // You could handle new logs here
          break;
        case 'issue_created':
        case 'issue_updated':
          // You could handle issue updates here
          break;
        case 'project_created':
        case 'project_updated':
          // You could handle project updates here
          break;
        case 'task_created':
        case 'task_updated':
          // You could handle task updates here
          break;
        case 'agent_created':
        case 'agent_updated':
          // You could handle agent updates here
          break;
        case 'initial_data':
          console.log("Received initial data from WebSocket");
          break;
      }
    };
    
    // Handle agent query completed message
    const handleAgentQueryCompleted = (message: { jobId: string, response: string }) => {
      if (!message.jobId) return;
      
      const pendingQuery = pendingAgentQueries[message.jobId];
      
      if (pendingQuery) {
        // Clear the timeout to prevent timeouts
        clearTimeout(pendingQuery.timeout);
        
        // Resolve the promise with the response
        pendingQuery.resolve(message.response);
        
        // Remove from pending queries
        delete pendingAgentQueries[message.jobId];
        
        console.log(`Resolved agent query: ${message.jobId}`);
      } else {
        console.log(`No pending query found for jobId: ${message.jobId}`);
      }
    };
    
    // Handle agent query error message
    const handleAgentQueryError = (message: { jobId: string, error: string }) => {
      if (!message.jobId) return;
      
      const pendingQuery = pendingAgentQueries[message.jobId];
      
      if (pendingQuery) {
        // Clear the timeout to prevent timeouts
        clearTimeout(pendingQuery.timeout);
        
        // Reject the promise with the error
        pendingQuery.reject(new Error(message.error || 'Unknown error occurred'));
        
        // Remove from pending queries
        delete pendingAgentQueries[message.jobId];
        
        // Show error toast
        toast({
          title: "Agent Error",
          description: message.error || "An error occurred with the agent query",
          variant: "destructive",
        });
        
        console.log(`Rejected agent query: ${message.jobId} with error: ${message.error}`);
      } else {
        console.log(`No pending query found for error jobId: ${message.jobId}`);
      }
    };
    
    // Handle successful connection
    const handleConnect = () => {
      setConnected(true);
      console.log("WebSocket connected");
    };
    
    // Handle disconnection
    const handleDisconnect = () => {
      setConnected(false);
      console.log("WebSocket disconnected");
    };
    
    // Create the WebSocket connection
    socketRef.current = createWebSocketConnection(
      handleMessage,
      handleConnect,
      handleDisconnect
    );
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [toast]);
  
  return (
    <CookieConsentProvider>
      <AuthProvider>
        <AppRoutes />
        <CookieConsent />
        <Toaster />
      </AuthProvider>
    </CookieConsentProvider>
  );
}

export default App;
