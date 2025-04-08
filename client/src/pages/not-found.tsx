import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-7xl font-bold text-neutral-200 mb-4">404</div>
      <h1 className="text-3xl font-bold text-neutral-900 mb-2">Page Not Found</h1>
      <p className="text-neutral-600 max-w-md mb-8">
        Sorry, we couldn't find the page you're looking for. The page might have been moved, 
        deleted, or is temporarily unavailable.
      </p>
      <Button asChild>
        <Link href="/">
          Return to Dashboard
        </Link>
      </Button>
    </div>
  );
}