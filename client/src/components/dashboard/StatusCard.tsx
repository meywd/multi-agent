import { cn } from "@/lib/utils";

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "warning" | "error" | "success";
  subtitle?: React.ReactNode;
  progress?: number;
}

export function StatusCard({
  title,
  value,
  icon,
  color,
  subtitle,
  progress
}: StatusCardProps) {
  const getColorClasses = (color: string) => {
    const colorMap = {
      primary: {
        bg: "bg-primary-light bg-opacity-10",
        text: "text-primary",
        progressBg: "bg-primary"
      },
      secondary: {
        bg: "bg-secondary-light bg-opacity-10",
        text: "text-secondary",
        progressBg: "bg-secondary"
      },
      warning: {
        bg: "bg-warning bg-opacity-10",
        text: "text-warning",
        progressBg: "bg-warning"
      },
      error: {
        bg: "bg-error bg-opacity-10",
        text: "text-error",
        progressBg: "bg-error"
      },
      success: {
        bg: "bg-success bg-opacity-10",
        text: "text-success",
        progressBg: "bg-success"
      }
    };
    
    return colorMap[color as keyof typeof colorMap] || colorMap.primary;
  };
  
  const colorClasses = getColorClasses(color);
  
  return (
    <div className="bg-white shadow-sm rounded-lg p-5 border border-neutral-200">
      <div className="flex items-center">
        <div className={cn("p-3 rounded-md", colorClasses.bg)}>
          {icon}
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
          <p className="text-2xl font-semibold text-neutral-900">{value}</p>
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div 
              className={cn("h-2 rounded-full", colorClasses.progressBg)} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      {subtitle && (
        <div className="mt-4 flex items-center">
          {subtitle}
        </div>
      )}
    </div>
  );
}
