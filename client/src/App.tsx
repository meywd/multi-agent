import { Route, Switch, useLocation } from "wouter";
import Dashboard from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import PlaygroundPage from "@/pages/playground";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useState } from "react";

function App() {
  const [location] = useLocation();
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
            <Route path="/playground" component={PlaygroundPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

export default App;
