import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeCode, generateCode, verifyImplementation } from "@/lib/aiService";
import { useToast } from "@/hooks/use-toast";

export function CodePlayground() {
  const [activeTab, setActiveTab] = useState("generate");
  const [language, setLanguage] = useState("javascript");
  const [framework, setFramework] = useState("");
  const [specification, setSpecification] = useState("");
  const [codeToAnalyze, setCodeToAnalyze] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [analyzeContext, setAnalyzeContext] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<{
    issues: any[];
    suggestions: string[];
  } | null>(null);
  const [requirementsToVerify, setRequirementsToVerify] = useState("");
  const [implementationToVerify, setImplementationToVerify] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    passed: boolean;
    score: number;
    feedback: string;
    issues: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
  };

  const handleFrameworkChange = (value: string) => {
    setFramework(value);
  };

  const handleGenerateCode = async () => {
    if (!specification.trim()) {
      toast({
        title: "Error",
        description: "Please enter a specification",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const code = await generateCode(specification, language, framework);
      setGeneratedCode(code);
    } catch (error) {
      console.error("Error generating code:", error);
      toast({
        title: "Error",
        description: "Failed to generate code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeCode = async () => {
    if (!codeToAnalyze.trim()) {
      toast({
        title: "Error",
        description: "Please enter code to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await analyzeCode(codeToAnalyze, analyzeContext);
      setAnalyzeResult(result);
    } catch (error) {
      console.error("Error analyzing code:", error);
      toast({
        title: "Error",
        description: "Failed to analyze code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyImplementation = async () => {
    if (!requirementsToVerify.trim() || !implementationToVerify.trim()) {
      toast({
        title: "Error",
        description: "Please enter both requirements and implementation",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyImplementation(requirementsToVerify, implementationToVerify);
      setVerificationResult(result);
    } catch (error) {
      console.error("Error verifying implementation:", error);
      toast({
        title: "Error",
        description: "Failed to verify implementation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Framework options based on selected language
  const getFrameworkOptions = () => {
    switch (language) {
      case "javascript":
      case "typescript":
        return (
          <>
            <SelectItem value="">None</SelectItem>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="vue">Vue</SelectItem>
            <SelectItem value="angular">Angular</SelectItem>
            <SelectItem value="express">Express</SelectItem>
            <SelectItem value="nextjs">Next.js</SelectItem>
          </>
        );
      case "python":
        return (
          <>
            <SelectItem value="">None</SelectItem>
            <SelectItem value="flask">Flask</SelectItem>
            <SelectItem value="django">Django</SelectItem>
            <SelectItem value="fastapi">FastAPI</SelectItem>
          </>
        );
      case "java":
        return (
          <>
            <SelectItem value="">None</SelectItem>
            <SelectItem value="spring">Spring</SelectItem>
            <SelectItem value="springboot">Spring Boot</SelectItem>
          </>
        );
      default:
        return <SelectItem value="">None</SelectItem>;
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="mb-5">
          <h2 className="text-lg font-medium text-neutral-800">Code Playground</h2>
          <p className="text-sm text-neutral-600">
            Generate, analyze, and verify code using AI agents
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
            <TabsTrigger value="verify">Verify</TabsTrigger>
          </TabsList>

          {/* Generate Code Tab */}
          <TabsContent value="generate" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Language</label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="go">Go</SelectItem>
                    <SelectItem value="rust">Rust</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Framework (Optional)</label>
                <Select value={framework} onValueChange={handleFrameworkChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select framework (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFrameworkOptions()}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Specification</label>
              <Textarea
                placeholder="Enter code specification details..."
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                className="min-h-[150px] font-medium"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleGenerateCode} disabled={isLoading}>
                {isLoading ? "Generating..." : "Generate Code"}
              </Button>
            </div>

            {generatedCode && (
              <div>
                <h3 className="text-sm font-medium mb-1">Generated Code:</h3>
                <div className="bg-neutral-100 p-3 rounded-md border border-neutral-200 font-mono text-sm overflow-auto max-h-[300px]">
                  <pre>{generatedCode}</pre>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Analyze Code Tab */}
          <TabsContent value="analyze" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Code Context (Optional)</label>
              <Textarea
                placeholder="Provide context for the code analysis..."
                value={analyzeContext}
                onChange={(e) => setAnalyzeContext(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Code to Analyze</label>
              <Textarea
                placeholder="Enter code to analyze..."
                value={codeToAnalyze}
                onChange={(e) => setCodeToAnalyze(e.target.value)}
                className="min-h-[150px] font-mono"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleAnalyzeCode} disabled={isLoading}>
                {isLoading ? "Analyzing..." : "Analyze Code"}
              </Button>
            </div>

            {analyzeResult && (
              <div className="space-y-3">
                {analyzeResult.issues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Issues:</h3>
                    <div className="space-y-2">
                      {analyzeResult.issues.map((issue, i) => (
                        <div key={i} className="p-2 rounded-md bg-neutral-100 border border-neutral-200">
                          <div className="flex justify-between">
                            <span className={`text-sm font-medium ${issue.type === 'error' ? 'text-error' : 'text-warning'}`}>
                              {issue.title}
                            </span>
                            <span className="text-xs bg-neutral-200 px-2 py-0.5 rounded">
                              {issue.type}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{issue.description}</p>
                          {issue.solution && (
                            <div className="mt-2">
                              <p className="text-xs text-success font-medium">Suggested solution:</p>
                              <pre className="text-xs bg-neutral-800 text-neutral-100 p-2 rounded mt-1 overflow-x-auto">
                                {issue.solution}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analyzeResult.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Suggestions:</h3>
                    <ul className="list-disc list-inside pl-2">
                      {analyzeResult.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-sm text-neutral-700">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analyzeResult.issues.length === 0 && analyzeResult.suggestions.length === 0 && (
                  <div className="text-sm text-success">
                    No issues or suggestions found. The code looks good!
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Verify Implementation Tab */}
          <TabsContent value="verify" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Requirements</label>
              <Textarea
                placeholder="Enter the requirements or specifications..."
                value={requirementsToVerify}
                onChange={(e) => setRequirementsToVerify(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Implementation</label>
              <Textarea
                placeholder="Enter the implementation to verify..."
                value={implementationToVerify}
                onChange={(e) => setImplementationToVerify(e.target.value)}
                className="min-h-[150px] font-mono"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleVerifyImplementation} disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify Implementation"}
              </Button>
            </div>

            {verificationResult && (
              <div className="p-3 rounded-md border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-full ${verificationResult.passed ? 'bg-success' : 'bg-error'}`}></div>
                    <h3 className="text-sm font-medium">
                      {verificationResult.passed ? "Pass" : "Fail"}
                    </h3>
                  </div>
                  <div className="text-sm">
                    Score: <span className="font-medium">{verificationResult.score}%</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Feedback:</h3>
                  <p className="text-sm">{verificationResult.feedback}</p>
                </div>

                {verificationResult.issues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Issues to Address:</h3>
                    <ul className="list-disc list-inside pl-2">
                      {verificationResult.issues.map((issue, i) => (
                        <li key={i} className="text-sm text-neutral-700">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}