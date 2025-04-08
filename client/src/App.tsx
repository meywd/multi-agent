import { Route, Switch } from "wouter";
import Dashboard from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import PlaygroundPage from "@/pages/playground";
import AgentsPage from "@/pages/agents";
import TasksPage from "@/pages/tasks";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useState } from "react";

function App() {
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
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={ProjectsPage} />
            <Route path="/projects/:id" component={ProjectDetailPage} />
            <Route path="/agents" component={AgentsPage} />
            <Route path="/tasks" component={TasksPage} />
            <Route path="/playground" component={PlaygroundPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

export default App;
