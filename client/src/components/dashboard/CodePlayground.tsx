import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { analyzeCode, generateCode, verifyImplementation } from "@/lib/aiService";
import { useToast } from "@/hooks/use-toast";

export function CodePlayground() {
  const [activeTab, setActiveTab] = useState("generate");
  const [specification, setSpecification] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [framework, setFramework] = useState("");
  const [codeToAnalyze, setCodeToAnalyze] = useState("");
  const [codeContext, setCodeContext] = useState("");
  const [requirements, setRequirements] = useState("");
  const [implementation, setImplementation] = useState("");
  const [testCases, setTestCases] = useState("");
  
  const [generatedCode, setGeneratedCode] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    issues: Array<{
      type: string;
      title: string;
      description: string;
      code?: string;
      solution?: string;
    }>;
    suggestions: string[];
  } | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    passed: boolean;
    score: number;
    feedback: string;
    issues: string[];
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateCode = async () => {
    if (!specification.trim()) {
      toast({
        title: "Empty specification",
        description: "Please enter a specification for code generation.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await generateCode(specification, {
        language,
        framework: framework.trim() || undefined,
        existingCode: ""
      });
      
      setGeneratedCode(result);
    } catch (error) {
      console.error("Error generating code:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeCode = async () => {
    if (!codeToAnalyze.trim()) {
      toast({
        title: "Empty code",
        description: "Please enter code to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await analyzeCode({
        code: codeToAnalyze,
        context: codeContext.trim() || "General code review"
      });
      
      setAnalysisResult(result);
    } catch (error) {
      console.error("Error analyzing code:", error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyImplementation = async () => {
    if (!requirements.trim() || !implementation.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both requirements and implementation.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await verifyImplementation({
        requirements, 
        implementation,
        testCases: testCases.trim() ? testCases.split("\n").filter(Boolean) : undefined
      });
      
      setVerificationResult(result);
    } catch (error) {
      console.error("Error verifying implementation:", error);
      toast({
        title: "Verification failed",
        description: "Failed to verify implementation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Code Playground</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="flex-grow flex flex-col"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
            <TabsTrigger value="verify">Verify</TabsTrigger>
          </TabsList>
          
          {/* Generate Code Tab */}
          <TabsContent value="generate" className="flex-grow flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Language</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="JavaScript">JavaScript</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="Python">Python</option>
                  <option value="Java">Java</option>
                  <option value="C#">C#</option>
                  <option value="Go">Go</option>
                  <option value="Rust">Rust</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Framework (optional)</label>
                <input 
                  type="text"
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  placeholder="e.g., React, Express, Django..."
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>
            
            <div className="mb-4 flex-grow flex flex-col">
              <label className="text-sm font-medium mb-1 block">Specification</label>
              <Textarea
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                placeholder="Describe what you want the code to do..."
                className="flex-grow"
              />
            </div>
            
            <Button 
              onClick={handleGenerateCode}
              disabled={isLoading || !specification.trim()}
              className="self-end"
            >
              {isLoading ? "Generating..." : "Generate Code"}
            </Button>
            
            {generatedCode && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Generated Code:</h3>
                <pre className="bg-neutral-50 p-4 rounded-md border overflow-auto whitespace-pre-wrap max-h-[400px]">
                  {generatedCode}
                </pre>
              </div>
            )}
          </TabsContent>
          
          {/* Analyze Code Tab */}
          <TabsContent value="analyze" className="flex-grow flex flex-col">
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Context (optional)</label>
              <input 
                type="text"
                value={codeContext}
                onChange={(e) => setCodeContext(e.target.value)}
                placeholder="e.g., Performance review, security audit..."
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
            
            <div className="mb-4 flex-grow flex flex-col">
              <label className="text-sm font-medium mb-1 block">Code to Analyze</label>
              <Textarea
                value={codeToAnalyze}
                onChange={(e) => setCodeToAnalyze(e.target.value)}
                placeholder="Paste the code you want to analyze..."
                className="flex-grow"
              />
            </div>
            
            <Button 
              onClick={handleAnalyzeCode}
              disabled={isLoading || !codeToAnalyze.trim()}
              className="self-end"
            >
              {isLoading ? "Analyzing..." : "Analyze Code"}
            </Button>
            
            {analysisResult && (
              <div className="mt-4 space-y-4">
                {analysisResult.issues.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Issues Found:</h3>
                    <div className="space-y-3">
                      {analysisResult.issues.map((issue, idx) => (
                        <div key={idx} className={`p-3 rounded-md border ${issue.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <div className="flex justify-between mb-1">
                            <span className={`text-sm font-medium ${issue.type === 'error' ? 'text-red-800' : 'text-yellow-800'}`}>
                              {issue.type === 'error' ? '🐞 Error: ' : '⚠️ Warning: '}{issue.title}
                            </span>
                          </div>
                          <p className="text-sm">{issue.description}</p>
                          {issue.code && (
                            <pre className="mt-2 text-xs p-2 bg-white/70 rounded border border-current/10 overflow-x-auto">
                              {issue.code}
                            </pre>
                          )}
                          {issue.solution && (
                            <div className="mt-2">
                              <span className="text-xs font-medium">Suggested solution:</span>
                              <pre className="mt-1 text-xs p-2 bg-white/70 rounded border border-current/10 overflow-x-auto">
                                {issue.solution}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-md border bg-green-50 border-green-200 text-green-800">
                    <p>✅ No issues found in the code!</p>
                  </div>
                )}
                
                {analysisResult.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Suggestions:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysisResult.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Verify Implementation Tab */}
          <TabsContent value="verify" className="flex-grow flex flex-col">
            <div className="grid grid-cols-1 gap-4 mb-4 flex-grow">
              <div>
                <label className="text-sm font-medium mb-1 block">Requirements</label>
                <Textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Enter the requirements or specifications..."
                  className="h-28"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Implementation</label>
                <Textarea
                  value={implementation}
                  onChange={(e) => setImplementation(e.target.value)}
                  placeholder="Enter the implementation code to verify..."
                  className="h-28"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Test Cases (optional, one per line)</label>
                <Textarea
                  value={testCases}
                  onChange={(e) => setTestCases(e.target.value)}
                  placeholder="Enter test cases or expected behaviors..."
                  className="h-28"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleVerifyImplementation}
              disabled={isLoading || !requirements.trim() || !implementation.trim()}
              className="self-end"
            >
              {isLoading ? "Verifying..." : "Verify Implementation"}
            </Button>
            
            {verificationResult && (
              <div className="mt-4">
                <div className={`p-4 rounded-md border mb-3 ${
                  verificationResult.passed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-medium ${
                      verificationResult.passed ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {verificationResult.passed ? '✅ Verification Passed' : '❌ Verification Failed'}
                    </span>
                    <span className="text-sm font-medium">
                      Score: {verificationResult.score}/100
                    </span>
                  </div>
                  
                  <div className="h-2 w-full bg-gray-200 rounded-full mb-3">
                    <div 
                      className={`h-2 rounded-full ${
                        verificationResult.score >= 70 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${verificationResult.score}%` }}
                    />
                  </div>
                  
                  <p className="text-sm">{verificationResult.feedback}</p>
                  
                  {verificationResult.issues.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs font-medium">Issues to address:</span>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {verificationResult.issues.map((issue, idx) => (
                          <li key={idx} className="text-xs">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}