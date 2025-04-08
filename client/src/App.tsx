import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAgentContext } from "./context/AgentContext";

function App() {
  const location = useLocation();
  const { connectWebSocket } = useAgentContext();

  // Connect to WebSocket when the app loads
  useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

export default App;
