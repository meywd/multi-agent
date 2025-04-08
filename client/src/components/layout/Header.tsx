import { useEffect, useState } from "react";
import { useAgentContext } from "@/context/AgentContext";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const { metrics, agents } = useAgentContext();
  const { toast } = useToast();
  const [hasNotifications, setHasNotifications] = useState(true);

  // Example of showing a toast when a new issue is detected
  useEffect(() => {
    if (metrics.criticalIssues > 0) {
      setHasNotifications(true);
    }
  }, [metrics.criticalIssues]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    toast({
      title: "Search",
      description: `Searching for: ${searchQuery}`,
    });
  };

  const handleNotificationClick = () => {
    setHasNotifications(false);
    toast({
      title: "Notifications",
      description: "You have new issues that need attention",
      variant: "destructive",
    });
  };

  const handleSettingsClick = () => {
    toast({
      title: "Settings",
      description: "Settings panel will be available soon",
    });
  };

  const handleHelpClick = () => {
    toast({
      title: "Help",
      description: "Documentation and help resources will be available soon",
    });
  };

  return (
    <header className="bg-white border-b border-neutral-200 p-4 flex items-center justify-between">
      <div className="flex-1 flex items-center">
        <form onSubmit={handleSearchSubmit} className="w-full max-w-xs">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-neutral-400"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              type="search"
              className="w-full bg-neutral-100 border-transparent focus:border-primary focus:bg-white focus:ring-0 rounded-md pl-10 pr-4 py-2 text-sm placeholder-neutral-500"
              placeholder="Search commands, agents..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </form>
      </div>

      <div className="flex items-center ml-4 space-x-4">
        <button
          className="text-neutral-500 hover:text-neutral-900 relative"
          onClick={handleNotificationClick}
          aria-label="Notifications"
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
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {hasNotifications && (
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-error transform translate-x-1/2 -translate-y-1/2"></span>
          )}
        </button>
        <button
          className="text-neutral-500 hover:text-neutral-900"
          onClick={handleSettingsClick}
          aria-label="Settings"
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
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          className="text-neutral-500 hover:text-neutral-900"
          onClick={handleHelpClick}
          aria-label="Help"
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
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
      </div>
    </header>
  );
}
