import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="border-b border-neutral-200 bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-3 md:px-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost"
            size="icon"
            className="md:hidden" 
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white font-medium">
              AI
            </span>
            
            <span className="text-sm sm:text-base md:text-lg font-semibold text-neutral-800 truncate">Multi-Agent Platform</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          <Link href="https://github.com/yourusername/multi-agent-platform" target="_blank">
            <Button variant="outline" size="sm" className="hidden md:flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              Github
            </Button>
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="icon" className="hidden sm:flex">
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
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              <span className="sr-only">Favorites</span>
            </Button>
            
            <Button variant="outline" size="icon">
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
              <span className="sr-only">Notifications</span>
            </Button>
          </div>
          
          <div className="relative">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-neutral-800 hover:bg-neutral-300">
              <span className="text-xs sm:text-sm font-medium">AJ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}