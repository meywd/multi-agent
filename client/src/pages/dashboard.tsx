import { useState } from "react";
import { CodePlayground } from "@/components/dashboard/CodePlayground";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const [showCodePlayground, setShowCodePlayground] = useState(false);
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">AI Agent Dashboard</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Multi-agent AI system for application development
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Dashboard Status</h3>
            <p className="text-neutral-600 mb-4">
              Welcome to the multi-agent AI system. This platform enables AI agents to collaborate
              on building, debugging, and verifying applications.
            </p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="text-sm">Server is running</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Available Tools</h3>
            <p className="text-neutral-600 mb-4">
              Generate code, analyze implementations, and test specifications using our AI-powered tools.
            </p>
            <Button 
              onClick={() => setShowCodePlayground(!showCodePlayground)}
              className="w-full"
            >
              {showCodePlayground ? "Hide Code Playground" : "Show Code Playground"}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Quick Navigation</h3>
            <p className="text-neutral-600 mb-4">
              Use our simplified navigation to explore the application.
            </p>
            <div className="space-y-2">
              <Link href="/test">
                <Button variant="outline" className="w-full">
                  Test Page
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Dashboard
                </Button>
              </Link>
            </div>
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
