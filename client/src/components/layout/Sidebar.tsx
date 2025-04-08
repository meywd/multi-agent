import { Link, useLocation } from "wouter";
import { useAgentContext } from "@/context/AgentContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { agents } = useAgentContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-success';
      case 'busy':
        return 'bg-warning';
      case 'offline':
        return 'bg-neutral-300';
      default:
        return 'bg-neutral-300';
    }
  };

  const getRoleColorClass = (role: string) => {
    switch (role) {
      case 'coordinator':
        return 'bg-secondary-light bg-opacity-20 text-secondary';
      case 'developer':
        return 'bg-primary-light bg-opacity-20 text-primary';
      case 'qa':
        return 'bg-warning bg-opacity-20 text-warning';
      case 'tester':
        return 'bg-neutral-200 text-neutral-700';
      default:
        return 'bg-neutral-200 text-neutral-700';
    }
  };

  const sidebarClasses = cn(
    "w-64 bg-white border-r border-neutral-200 flex flex-col h-full",
    isMobileMenuOpen ? "block" : "hidden lg:flex"
  );

  return (
    <>
      {/* Mobile menu toggle button - visible on small screens */}
      <button
        className="lg:hidden fixed top-4 left-4 z-20 text-neutral-500 hover:text-neutral-900"
        onClick={toggleMobileMenu}
        aria-label="Toggle sidebar menu"
      >
        <i className="ri-menu-line text-xl"></i>
      </button>

      <aside className={sidebarClasses}>
        <div className="p-4 border-b border-neutral-200">
          <h1 className="text-xl font-semibold text-primary flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M14 8a2 2 0 1 0-4 0" />
              <path d="M12 10v4" />
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="M6 16v-2" />
              <path d="M18 16v-2" />
              <path d="M10 16v-2" />
              <path d="M14 16v-2" />
            </svg>
            AgentCollab
          </h1>
          <p className="text-xs text-neutral-500 mt-1">Multi-Agent Development Platform</p>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4">
          <div className="px-4 mb-2">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Dashboard
            </h2>
            <ul className="mt-2 space-y-1">
              <li>
                <Link 
                  href="/"
                  className={cn(
                    "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    location === "/" 
                      ? "bg-primary-light bg-opacity-10 text-primary" 
                      : "text-neutral-700 hover:bg-neutral-100"
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-3 h-4 w-4"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 9h6v6H9z" />
                    <path d="M9 3v6" />
                    <path d="M15 3v6" />
                    <path d="M9 15v6" />
                    <path d="M15 15v6" />
                    <path d="M3 9h6" />
                    <path d="M15 9h6" />
                    <path d="M3 15h6" />
                    <path d="M15 15h6" />
                  </svg>
                  Overview
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-700 hover:bg-neutral-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-3 h-4 w-4 text-neutral-500"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Projects
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-700 hover:bg-neutral-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-3 h-4 w-4 text-neutral-500"
                  >
                    <path d="M3 12h4l3 8 4-16 3 8h4" />
                  </svg>
                  Activity Log
                </a>
              </li>
            </ul>
          </div>

          <div className="px-4 mb-2 mt-6">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Agents
            </h2>
            <ul className="mt-2 space-y-1">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <a
                    href="#"
                    className="flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md text-neutral-700 hover:bg-neutral-100"
                  >
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full ${getStatusColorClass(agent.status)} mr-3`}></span>
                      <span>{agent.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${getRoleColorClass(agent.role)}`}>
                      {agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-4 mb-2 mt-6">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Settings
            </h2>
            <ul className="mt-2 space-y-1">
              <li>
                <a
                  href="#"
                  className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-700 hover:bg-neutral-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-3 h-4 w-4 text-neutral-500"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Configuration
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-700 hover:bg-neutral-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-3 h-4 w-4 text-neutral-500"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <path d="M12 7A4 4 0 1 0 8 3a4 4 0 0 0 4 4" />
                  </svg>
                  User Preferences
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
              <span className="text-sm font-medium">JD</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-700">John Doe</p>
              <p className="text-xs text-neutral-500">Project Lead</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
