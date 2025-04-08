import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export function Sidebar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  // Only show on larger screens if not collapsed
  const isVisible = !isMobile && !isCollapsed;

  const navItems = [
    {
      name: "Dashboard",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
      href: "/",
      isActive: location === "/"
    },
    {
      name: "Test Page",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M17 6H3" />
          <path d="M17 12H3" />
          <path d="M17 18H3" />
          <path d="M21 6v.01" />
          <path d="M21 12v.01" />
          <path d="M21 18v.01" />
        </svg>
      ),
      href: "/test",
      isActive: location === "/test"
    },
    {
      name: "Agents",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      href: "/agents",
      isActive: location === "/agents"
    },
    {
      name: "Tasks",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M8 6h10" />
          <path d="M6 12h9" />
          <path d="M11 18h7" />
        </svg>
      ),
      href: "/tasks",
      isActive: location === "/tasks"
    },
    {
      name: "Analytics",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
      href: "/analytics",
      isActive: location === "/analytics"
    },
    {
      name: "Playground",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="m18 16 4-4-4-4" />
          <path d="m6 8-4 4 4 4" />
          <path d="m14.5 4-5 16" />
        </svg>
      ),
      href: "/playground",
      isActive: location === "/playground"
    }
  ];

  if (!isVisible) return null;

  return (
    <div className="border-r border-neutral-200 bg-white w-64 h-screen flex flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white font-medium">
            AI
          </div>
          <span className="text-lg font-semibold text-neutral-800">Multi-Agent</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleCollapse}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="sr-only">Collapse sidebar</span>
        </Button>
      </div>

      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {navItems.map(item => (
            <Link key={item.name} href={item.href}>
              <Button
                variant={item.isActive ? "secondary" : "ghost"}
                className={`w-full justify-start ${item.isActive ? 'font-medium' : ''}`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t border-neutral-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-neutral-800">
            <span className="text-sm font-medium">AJ</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-800">Alex Johnson</span>
            <span className="text-xs text-neutral-500">Administrator</span>
          </div>
        </div>
      </div>
    </div>
  );
}