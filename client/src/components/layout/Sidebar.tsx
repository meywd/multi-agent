import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [location] = useLocation();

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
      name: "Projects",
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
          <path d="M3 3h18v18H3z" />
          <path d="M13 7H8v9h9v-5" />
          <path d="M13 7V3" />
          <path d="M13 7h5" />
        </svg>
      ),
      href: "/projects",
      isActive: location === "/projects" || location.startsWith("/projects/")
    },
    {
      name: "Features",
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
          <path d="M16.5 9.4 7.5 4.21" />
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        </svg>
      ),
      href: "/features",
      isActive: location === "/features" || location.startsWith("/features/")
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
          <path d="M12 2H2v10h10V2z" />
          <path d="M7 7h10v10H7V7z" />
          <path d="M12 12h10v10H12V12z" />
        </svg>
      ),
      href: "/tasks",
      isActive: location === "/tasks" || location.startsWith("/tasks/")
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

  return (
    <div 
      className={`fixed inset-y-0 left-0 z-50 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                 md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
                 border-r border-neutral-200 bg-white w-64 h-screen flex flex-col`}
    >
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
          onClick={onToggle}
          className="md:hidden"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>

      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {navItems.map(item => (
            <Link 
              key={item.name} 
              href={item.href} 
              onClick={(e) => {
                // Close sidebar on mobile
                if (window.innerWidth < 768) {
                  onToggle();
                }
              }}
            >
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