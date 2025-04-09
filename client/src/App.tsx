import { Route, Switch, useLocation } from "wouter";
import Dashboard from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import FeatureDetailPage from "@/pages/feature-detail";
import TaskDetailPage from "@/pages/task-detail";
import PlaygroundPage from "@/pages/playground";
import AgentsPage from "@/pages/agents";
import TasksPage from "@/pages/tasks";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useState } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Toaster } from "@/components/ui/toaster";

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
        <ProtectedRoute path="/features/:id" component={FeatureDetailPage} />
        <ProtectedRoute path="/tasks/:id" component={TaskDetailPage} />
        <ProtectedRoute path="/agents" component={AgentsPage} />
        <ProtectedRoute path="/tasks" component={TasksPage} />
        <ProtectedRoute path="/playground" component={PlaygroundPage} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
