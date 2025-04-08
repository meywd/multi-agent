import { useState } from "react";
import { CodePlayground } from "@/components/dashboard/CodePlayground";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [showCodePlayground, setShowCodePlayground] = useState(false);
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">AI Agent Dashboard</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Simplified dashboard for troubleshooting
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Dashboard Status</h3>
            <p className="text-neutral-600 mb-4">
              This is a simplified dashboard for troubleshooting. The full dashboard functionality 
              has been temporarily disabled.
            </p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="text-sm">Server is running</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
            <p className="text-neutral-600 mb-4">
              There seems to be an issue with the WebSocket connection. We're using a simplified
              dashboard without real-time updates for now.
            </p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm">Limited functionality</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Available Tools</h3>
            <p className="text-neutral-600 mb-4">
              Some tools are still available for testing purposes.
            </p>
            <Button 
              onClick={() => setShowCodePlayground(!showCodePlayground)}
              className="w-full"
            >
              {showCodePlayground ? "Hide Code Playground" : "Show Code Playground"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {showCodePlayground && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-4">Development Tools</h2>
          <CodePlayground />
        </div>
      )}
    </div>
  );
}
