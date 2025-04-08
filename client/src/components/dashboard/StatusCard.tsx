import { Card, CardContent } from "@/components/ui/card";
import React from "react";

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
  progress,
}: StatusCardProps) {
  const colorClasses = {
    primary: "bg-blue-50 text-blue-500 border-blue-200",
    secondary: "bg-purple-50 text-purple-500 border-purple-200",
    warning: "bg-yellow-50 text-yellow-500 border-yellow-200",
    error: "bg-red-50 text-red-500 border-red-200",
    success: "bg-green-50 text-green-500 border-green-200",
  };

  const progressColorClasses = {
    primary: "bg-blue-500",
    secondary: "bg-purple-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    success: "bg-green-500",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between mb-3">
          <div className="text-sm font-medium text-neutral-700">{title}</div>
          <div className={`p-2 rounded-full ${colorClasses[color]}`}>{icon}</div>
        </div>

        <div className="text-2xl font-bold text-neutral-900 mb-1">{value}</div>

        {subtitle && <div className="text-xs text-neutral-600">{subtitle}</div>}

        {typeof progress === "number" && (
          <div className="mt-3 w-full bg-neutral-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${progressColorClasses[color]}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}