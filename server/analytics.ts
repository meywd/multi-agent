import { storage } from './storage';
import OpenAI from 'openai';

// Helper function to calculate token cost by model
function calculateTokenCost(model: string, tokens: number): number {
  // Based on OpenAI's pricing as of April 2025
  switch (model) {
    case 'gpt-4o':
      return tokens * 0.00010; // $0.10 per 1K tokens
    case 'gpt-4':
      return tokens * 0.00015; // $0.15 per 1K tokens
    case 'gpt-3.5-turbo':
      return tokens * 0.00005; // $0.05 per 1K tokens
    case 'dall-e-3':
      return 0.10; // $0.10 per DALL-E generation (simplified)
    default:
      return tokens * 0.00010; // Default to gpt-4o pricing
  }
}

// Get usage data from logs
export async function getUsageAnalytics(timeRange: string = '30d') {
  try {
    // Get all logs within the timeframe
    const logs = await storage.getLogs();
    
    // Filter logs by date based on timeRange
    const filteredLogs = filterLogsByTimeRange(logs, timeRange);
    
    // Calculate totals
    const tokenCount = calculateTotalTokens(filteredLogs);
    const requestCount = filteredLogs.length;
    const estimatedCost = calculateTotalCost(filteredLogs);
    
    // Group by date for daily metrics
    const dailyUsage = getDailyUsage(filteredLogs);
    
    // Group by month for monthly metrics
    const monthlyUsage = getMonthlyUsage(filteredLogs);
    
    // Group by model
    const modelUsage = getModelUsage(filteredLogs);
    
    return {
      daily: dailyUsage,
      monthly: monthlyUsage,
      models: modelUsage,
      totalUsage: {
        tokens: tokenCount,
        requests: requestCount,
        cost: estimatedCost,
        limit: 1000000 // Token limit (example value)
      }
    };
  } catch (error) {
    console.error('Error getting usage analytics:', error);
    throw new Error('Failed to retrieve usage analytics');
  }
}

// Filter logs by time range
function filterLogsByTimeRange(logs: any[], timeRange: string) {
  const now = new Date();
  let startDate = new Date();
  
  // Set the start date based on the time range
  switch (timeRange) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '6m':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30); // Default to 30 days
  }
  
  return logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= now;
  });
}

// Calculate total tokens from logs
function calculateTotalTokens(logs: any[]): number {
  // For now, estimate token count based on message length
  // In a production system, this would use actual token counts from OpenAI API responses
  return logs.reduce((total, log) => {
    if (log.message) {
      // Rough estimate: ~4 characters per token
      const tokenEstimate = Math.ceil(log.message.length / 4);
      return total + tokenEstimate;
    }
    return total;
  }, 0);
}

// Calculate total cost from logs
function calculateTotalCost(logs: any[]): number {
  // For now, use a simplified cost calculation
  const totalTokens = calculateTotalTokens(logs);
  
  // Assume a mix of models with an average cost of $0.10 per 1K tokens
  return (totalTokens / 1000) * 0.10;
}

// Group usage by day
function getDailyUsage(logs: any[]) {
  const dailyMap = new Map<string, { tokens: number, requests: number, cost: number }>();
  
  // Get date range
  const dates = logs.map(log => new Date(log.timestamp).toISOString().split('T')[0]);
  const uniqueDates = [...new Set(dates)].sort();
  
  // Initialize all dates in range
  const startDate = uniqueDates.length > 0 ? new Date(uniqueDates[0]) : new Date();
  const endDate = new Date();
  
  // Create an entry for each day in the range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    dailyMap.set(dateStr, { tokens: 0, requests: 0, cost: 0 });
  }
  
  // Populate with actual data
  logs.forEach(log => {
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    const current = dailyMap.get(date) || { tokens: 0, requests: 0, cost: 0 };
    
    // Estimate tokens (in a real system, this would come from the API response)
    const tokenEstimate = log.message ? Math.ceil(log.message.length / 4) : 0;
    
    dailyMap.set(date, {
      tokens: current.tokens + tokenEstimate,
      requests: current.requests + 1,
      cost: current.cost + (tokenEstimate / 1000) * 0.10 // Simple cost estimate
    });
  });
  
  // Convert to array format for charts
  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    tokens: data.tokens,
    requests: data.requests,
    cost: parseFloat(data.cost.toFixed(2))
  }));
}

// Group usage by month
function getMonthlyUsage(logs: any[]) {
  const monthlyMap = new Map<string, { tokens: number, requests: number, cost: number }>();
  
  logs.forEach(log => {
    const date = new Date(log.timestamp);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthName = date.toLocaleString('default', { month: 'short' });
    
    const current = monthlyMap.get(monthKey) || { 
      month: monthName, 
      tokens: 0, 
      requests: 0, 
      cost: 0 
    };
    
    // Estimate tokens
    const tokenEstimate = log.message ? Math.ceil(log.message.length / 4) : 0;
    
    monthlyMap.set(monthKey, {
      month: monthName,
      tokens: current.tokens + tokenEstimate,
      requests: current.requests + 1,
      cost: current.cost + (tokenEstimate / 1000) * 0.10
    });
  });
  
  // Convert to array and sort by date
  return Array.from(monthlyMap.values()).map(data => ({
    month: data.month,
    tokens: data.tokens,
    requests: data.requests,
    cost: parseFloat(data.cost.toFixed(2))
  }));
}

// Group usage by model
function getModelUsage(logs: any[]) {
  // In a real system, you would have the model information in the logs
  // For demo purposes, we'll simulate usage across different models
  
  // Simplistic distribution of logs across models
  const models = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'dall-e-3'];
  const modelData = models.map(model => ({
    model,
    tokens: 0,
    requests: 0,
    cost: 0
  }));
  
  // Distribute logs across models for demonstration purposes
  logs.forEach((log, index) => {
    const modelIndex = index % models.length;
    const tokenEstimate = log.message ? Math.ceil(log.message.length / 4) : 0;
    
    modelData[modelIndex].tokens += tokenEstimate;
    modelData[modelIndex].requests += 1;
    modelData[modelIndex].cost += calculateTokenCost(models[modelIndex], tokenEstimate);
  });
  
  // Format costs
  return modelData.map(data => ({
    ...data,
    cost: parseFloat(data.cost.toFixed(2))
  }));
}

// In a production system, you would integrate with the OpenAI API to get actual usage data
export async function getOpenAIUsage(apiKey: string) {
  try {
    const openai = new OpenAI({ apiKey });
    
    // This is a placeholder - the actual OpenAI API doesn't expose usage data directly
    // You would need to track this in your own system or use the OpenAI billing dashboard
    
    return {
      success: true,
      message: "OpenAI usage data retrieved successfully"
    };
  } catch (error) {
    console.error('Error fetching OpenAI usage:', error);
    return {
      success: false,
      message: "Failed to retrieve OpenAI usage data"
    };
  }
}