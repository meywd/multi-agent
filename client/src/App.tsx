import { Route, Switch, useLocation } from "wouter";
import Dashboard from "@/pages/dashboard";
import TestPage from "@/pages/test";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

function App() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/test" component={TestPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

export default App;
