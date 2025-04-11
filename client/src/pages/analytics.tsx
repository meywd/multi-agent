import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Loader2, AlertTriangle } from "lucide-react";

interface UsageData {
  daily: {
    date: string;
    tokens: number;
    requests: number;
    cost: number;
  }[];
  monthly: {
    month: string;
    tokens: number;
    requests: number;
    cost: number;
  }[];
  models: {
    model: string;
    tokens: number;
    requests: number;
    cost: number;
  }[];
  totalUsage: {
    tokens: number;
    requests: number;
    cost: number;
    limit: number;
  };
}

export default function Analytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("30d");
  
  // Fetch analytics data
  const { data: usageData, isLoading, error } = useQuery<UsageData>({
    queryKey: ["/api/analytics/usage", timeRange],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Error Loading Analytics</h1>
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "An unknown error occurred"}
        </p>
      </div>
    );
  }

  // If no data is available yet, show placeholder
  if (!usageData) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Usage Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Tokens</CardTitle>
              <CardDescription>No data available</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>API Requests</CardTitle>
              <CardDescription>No data available</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Estimated Cost</CardTitle>
              <CardDescription>No data available</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Usage Quota</CardTitle>
              <CardDescription>No data available</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Sample data for development
  const sampleData = {
    daily: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tokens: Math.floor(Math.random() * 5000) + 1000,
      requests: Math.floor(Math.random() * 50) + 10,
      cost: (Math.random() * 2).toFixed(2)
    })),
    monthly: Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - 5 + i);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        tokens: Math.floor(Math.random() * 150000) + 50000,
        requests: Math.floor(Math.random() * 1500) + 500,
        cost: (Math.random() * 60).toFixed(2)
      };
    }),
    models: [
      { model: "gpt-4o", tokens: 245000, requests: 1200, cost: 24.50 },
      { model: "gpt-4", tokens: 120000, requests: 600, cost: 18.00 },
      { model: "gpt-3.5", tokens: 80000, requests: 400, cost: 4.00 },
      { model: "dall-e-3", tokens: 0, requests: 50, cost: 5.00 },
    ],
    totalUsage: {
      tokens: 445000,
      requests: 2250,
      cost: 51.50,
      limit: 1000000
    }
  };

  // Use actual data when available, otherwise use sample data for development
  const displayData = usageData || sampleData;
  const { totalUsage } = displayData;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Usage Analytics</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Time Range:</span>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Usage overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Tokens</CardTitle>
            <CardDescription>Current billing period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsage.tokens.toLocaleString()}</div>
            <Progress 
              className="mt-2" 
              value={(totalUsage.tokens / totalUsage.limit) * 100} 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((totalUsage.tokens / totalUsage.limit) * 100)}% of your limit
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API Requests</CardTitle>
            <CardDescription>Total calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsage.requests.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Estimated Cost</CardTitle>
            <CardDescription>Current period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalUsage.cost.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Usage Quota</CardTitle>
            <CardDescription>Token limit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsage.limit.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts section */}
      <Tabs defaultValue="daily" className="mb-6">
        <TabsHeader>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="models">By Model</TabsTrigger>
          </TabsList>
        </TabsHeader>
        
        <TabsContent value="daily" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Usage</CardTitle>
              <CardDescription>Token usage over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={displayData.daily}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 30,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                    />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'tokens' ? value.toLocaleString() : name === 'cost' ? `$${value}` : value,
                      name === 'tokens' ? 'Tokens' : name === 'requests' ? 'Requests' : 'Cost'
                    ]} />
                    <Line
                      type="monotone"
                      dataKey="tokens"
                      stroke="#8884d8"
                      name="Tokens"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="requests"
                      stroke="#82ca9d"
                      name="Requests"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="monthly" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Usage</CardTitle>
              <CardDescription>Token usage over the past 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={displayData.monthly}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 30,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'tokens' ? value.toLocaleString() : name === 'cost' ? `$${value}` : value,
                      name === 'tokens' ? 'Tokens' : name === 'requests' ? 'Requests' : 'Cost'
                    ]} />
                    <Bar dataKey="tokens" fill="#8884d8" name="Tokens" />
                    <Bar dataKey="cost" fill="#82ca9d" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="models" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Model</CardTitle>
              <CardDescription>Token distribution across different AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={displayData.models}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 30,
                    }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="model" type="category" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value, name) => [
                      name === 'tokens' ? value.toLocaleString() : name === 'cost' ? `$${value}` : value,
                      name === 'tokens' ? 'Tokens' : name === 'requests' ? 'Requests' : 'Cost ($)'
                    ]} />
                    <Bar dataKey="tokens" fill="#8884d8" name="Tokens" />
                    <Bar dataKey="requests" fill="#82ca9d" name="Requests" />
                    <Bar dataKey="cost" fill="#ffc658" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for tabs header styling
function TabsHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b">
      <div className="container mx-auto">
        {children}
      </div>
    </div>
  );
}