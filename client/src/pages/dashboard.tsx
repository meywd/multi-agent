import { useState } from "react";
import { CodePlayground } from "@/components/dashboard/CodePlayground";
import ProjectsSection from "@/components/dashboard/ProjectsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const [showCodePlayground, setShowCodePlayground] = useState(false);
  
  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">AI Agent Dashboard</h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1">
          Multi-agent AI system for application development
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Dashboard Status</h3>
            <p className="text-xs sm:text-sm text-neutral-600 mb-3 sm:mb-4">
              Welcome to the multi-agent AI system. This platform enables AI agents to collaborate
              on building, debugging, and verifying applications.
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2 sm:h-3 w-2 sm:w-3 rounded-full bg-green-500"></div>
              <span className="text-xs sm:text-sm">Server is running</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Available Tools</h3>
            <p className="text-xs sm:text-sm text-neutral-600 mb-3 sm:mb-4">
              Generate code, analyze implementations, and test specifications using our AI-powered tools.
            </p>
            <Button 
              onClick={() => setShowCodePlayground(!showCodePlayground)}
              className="w-full text-xs sm:text-sm"
              size="sm"
            >
              {showCodePlayground ? "Hide Code Playground" : "Show Code Playground"}
            </Button>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Quick Navigation</h3>
            <p className="text-xs sm:text-sm text-neutral-600 mb-3 sm:mb-4">
              Use our simplified navigation to explore the application.
            </p>
            <div className="space-y-2">
              <Link href="/projects">
                <Button variant="outline" className="w-full text-xs sm:text-sm" size="sm">
                  Projects
                </Button>
              </Link>
              <Link href="/playground">
                <Button variant="outline" className="w-full text-xs sm:text-sm" size="sm">
                  Playground
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Section */}
      <div className="mb-6 md:mb-8">
        <ProjectsSection />
      </div>

      {showCodePlayground && (
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 mb-3 sm:mb-4">Development Tools</h2>
          <CodePlayground />
        </div>
      )}
    </div>
  );
}
