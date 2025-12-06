import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Target,
  FileText,
  Zap,
  RefreshCw,
  Info,
  Eye,
  Settings,
  BarChart3,
  Shield,
  Clock,
  BookOpen,
  Image as ImageIcon,
  List,
  Table,
  Heading
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  category: 'structure' | 'content' | 'formatting' | 'accessibility' | 'language' | 'template';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  suggestion?: string;
  position?: {
    line: number;
    column: number;
    context: string;
  };
  autoFixable: boolean;
}

interface FormatMetrics {
  readability: {
    score: number;
    factors: {
      averageSentenceLength: number;
      complexityScore: number;
      vocabularyDiversity: number;
    };
  };
  structure: {
    score: number;
    headings: number;
    sections: number;
    tables: number;
    lists: number;
  };
  compliance: {
    score: number;
    templateAlignment: number;
    variableCompletion: number;
    formatConsistency: number;
  };
  accessibility: {
    score: number;
    altTextCoverage: number;
    headingHierarchy: boolean;
    colorContrast: boolean;
  };
}

interface ValidationResult {
  overallScore: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  metrics: FormatMetrics;
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
    autoFixableIssues: number;
  };
  recommendations: string[];
  estimatedImprovement: number;
}

interface FormatValidationProps {
  content: string;
  template?: any;
  onValidationComplete?: (result: ValidationResult) => void;
  onFixIssues?: (issueIds: string[]) => void;
  showDetails?: boolean;
  autoValidate?: boolean;
  className?: string;
}

const mockValidationResult: ValidationResult = {
  overallScore: 87,
  grade: 'B+',
  metrics: {
    readability: {
      score: 92,
      factors: {
        averageSentenceLength: 15,
        complexityScore: 0.7,
        vocabularyDiversity: 0.8
      }
    },
    structure: {
      score: 85,
      headings: 5,
      sections: 8,
      tables: 2,
      lists: 3
    },
    compliance: {
      score: 78,
      templateAlignment: 85,
      variableCompletion: 70,
      formatConsistency: 80
    },
    accessibility: {
      score: 90,
      altTextCoverage: 85,
      headingHierarchy: true,
      colorContrast: true
    }
  },
  issues: [
    {
      id: '1',
      type: 'warning',
      category: 'template',
      severity: 'medium',
      message: 'Missing template variables',
      description: 'Some required template variables are not filled in',
      suggestion: 'Complete all required variables in the template',
      autoFixable: false
    },
    {
      id: '2',
      type: 'info',
      category: 'structure',
      severity: 'low',
      message: 'Consider adding more subsections',
      description: 'The content could benefit from additional subsections for better organization',
      suggestion: 'Add subsections to break down longer content sections',
      autoFixable: false
    },
    {
      id: '3',
      type: 'error',
      category: 'formatting',
      severity: 'high',
      message: 'Inconsistent heading levels',
      description: 'Some headings skip levels (H1 to H3 without H2)',
      position: { line: 12, column: 1, context: '### Activities' },
      suggestion: 'Use consistent heading hierarchy (H1 → H2 → H3)',
      autoFixable: true
    }
  ],
  summary: {
    totalIssues: 3,
    criticalIssues: 0,
    warningIssues: 1,
    infoIssues: 1,
    autoFixableIssues: 1
  },
  recommendations: [
    'Fill in missing template variables for better template compliance',
    'Fix heading hierarchy for better structure',
    'Consider adding more visual elements like images or diagrams',
    'Review content for consistency with educational standards'
  ],
  estimatedImprovement: 12
};

export function FormatValidation({
  content,
  template,
  onValidationComplete,
  onFixIssues,
  showDetails = true,
  autoValidate = true,
  className
}: FormatValidationProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);
  const [autoFixIssues, setAutoFixIssues] = useState<string[]>([]);

  useEffect(() => {
    if (autoValidate && content) {
      validateContent();
    }
  }, [content, autoValidate]);

  const validateContent = async () => {
    setIsValidating(true);

    // Simulate validation process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate validation logic
    const result = generateValidationResult(content, template);
    setValidationResult(result);
    onValidationComplete?.(result);

    // Auto-select auto-fixable issues
    const autoFixable = result.issues.filter(issue => issue.autoFixable).map(issue => issue.id);
    setAutoFixIssues(autoFixable);

    setIsValidating(false);
  };

  const generateValidationResult = (content: string, template?: any): ValidationResult => {
    // This is a mock implementation - in a real app, this would call an API
    const wordCount = content.split(/\s+/).length;
    const lineCount = content.split('\n').length;

    // Basic validation logic
    const issues: ValidationIssue[] = [];

    // Check for template variables
    if (content.includes('{{') && content.includes('}}')) {
      const variables = content.match(/\{\{[^}]+\}\}/g) || [];
      if (variables.length > 0) {
        issues.push({
          id: 'unfilled-vars',
          type: 'warning',
          category: 'template',
          severity: 'medium',
          message: 'Unfilled template variables',
          description: `Found ${variables.length} unfilled template variables`,
          suggestion: 'Fill in all template variables with appropriate content',
          autoFixable: false
        });
      }
    }

    // Check heading consistency
    const headings = content.match(/^#{1,6}\s+/gm) || [];
    if (headings.length > 0) {
      const headingLevels = headings.map(h => h.split('#').length - 1);
      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] - headingLevels[i-1] > 1) {
          issues.push({
            id: 'heading-skip',
            type: 'error',
            category: 'structure',
            severity: 'high',
            message: 'Inconsistent heading hierarchy',
            description: 'Heading levels skip intermediate levels',
            suggestion: 'Use proper heading hierarchy (H1 → H2 → H3)',
            autoFixable: true
          });
          break;
        }
      }
    }

    // Calculate scores based on content analysis
    const baseScore = Math.max(100 - (issues.filter(i => i.type === 'error').length * 15) -
                                (issues.filter(i => i.type === 'warning').length * 8) -
                                (issues.filter(i => i.type === 'info').length * 3), 0);

    const grade = getGradeFromScore(baseScore);

    return {
      overallScore: baseScore,
      grade,
      metrics: {
        readability: {
          score: Math.max(100 - Math.abs(15 - (wordCount / lineCount)) * 2, 60),
          factors: {
            averageSentenceLength: wordCount / (content.split(/[.!?]+/).length || 1),
            complexityScore: 0.7,
            vocabularyDiversity: 0.8
          }
        },
        structure: {
          score: Math.min(100, headings.length * 10 + 50),
          headings: headings.length,
          sections: headings.filter(h => h.startsWith('##')).length,
          tables: (content.match(/\|.*\|/g) || []).length,
          lists: (content.match(/^[-*+]\s+/gm) || []).length
        },
        compliance: {
          score: issues.filter(i => i.category === 'template').length > 0 ? 70 : 95,
          templateAlignment: 95,
          variableCompletion: issues.filter(i => i.category === 'template').length > 0 ? 60 : 100,
          formatConsistency: issues.filter(i => i.category === 'structure').length > 0 ? 75 : 100
        },
        accessibility: {
          score: 90,
          altTextCoverage: 85,
          headingHierarchy: true,
          colorContrast: true
        }
      },
      issues,
      summary: {
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        warningIssues: issues.filter(i => i.type === 'warning').length,
        infoIssues: issues.filter(i => i.type === 'info').length,
        autoFixableIssues: issues.filter(i => i.autoFixable).length
      },
      recommendations: [
        'Review and address all validation issues',
        'Consider adding more visual elements',
        'Ensure consistent formatting throughout',
        'Validate content against educational standards'
      ],
      estimatedImprovement: issues.filter(i => i.autoFixable).length * 5
    };
  };

  const getGradeFromScore = (score: number): ValidationResult['grade'] => {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (grade: string) => {
    switch (grade[0]) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      default: return 'text-red-600';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return XCircle;
      case 'warning': return AlertCircle;
      case 'info': return Info;
      case 'success': return CheckCircle;
      default: return Info;
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleAutoFix = () => {
    if (autoFixIssues.length > 0) {
      onFixIssues?.(autoFixIssues);
      setAutoFixIssues([]);
      // Re-validate after fixing
      setTimeout(validateContent, 1000);
    }
  };

  const toggleIssueSelection = (issueId: string) => {
    setAutoFixIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return Array.from(newSet);
    });
  };

  if (!validationResult && !isValidating) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No content to validate</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isValidating) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Validating content...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* Overall Score Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Format Validation Results
                </CardTitle>
                <CardDescription>
                  Content quality and format compliance analysis
                </CardDescription>
              </div>

              <Button variant="outline" onClick={validateContent} disabled={isValidating}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isValidating && "animate-spin")} />
                Revalidate
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className={cn("text-4xl font-bold", getGradeColor(validationResult.grade))}>
                  {validationResult.overallScore}
                </div>
                <div className={cn("text-xl font-semibold", getGradeColor(validationResult.grade))}>
                  Grade: {validationResult.grade}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Format Quality Score
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Readability</span>
                  <span className="text-sm font-medium">{validationResult.metrics.readability.score}%</span>
                </div>
                <Progress value={validationResult.metrics.readability.score} className="h-2" />

                <div className="flex justify-between items-center">
                  <span className="text-sm">Structure</span>
                  <span className="text-sm font-medium">{validationResult.metrics.structure.score}%</span>
                </div>
                <Progress value={validationResult.metrics.structure.score} className="h-2" />

                <div className="flex justify-between items-center">
                  <span className="text-sm">Compliance</span>
                  <span className="text-sm font-medium">{validationResult.metrics.compliance.score}%</span>
                </div>
                <Progress value={validationResult.metrics.compliance.score} className="h-2" />
              </div>

              {/* Issue Summary */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Issues</span>
                  <Badge variant={validationResult.summary.totalIssues > 0 ? "secondary" : "default"}>
                    {validationResult.summary.totalIssues}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Errors</span>
                  <Badge variant="destructive">
                    {validationResult.summary.criticalIssues}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Warnings</span>
                  <Badge variant="secondary">
                    {validationResult.summary.warningIssues}
                  </Badge>
                </div>

                {validationResult.summary.autoFixableIssues > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Auto-fixable</span>
                    <Badge variant="outline">
                      {validationResult.summary.autoFixableIssues}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-fix Button */}
            {validationResult.summary.autoFixableIssues > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-fix available</p>
                    <p className="text-xs text-muted-foreground">
                      {validationResult.summary.autoFixableIssues} issues can be automatically fixed
                    </p>
                  </div>
                  <Button onClick={handleAutoFix} disabled={autoFixIssues.length === 0}>
                    <Zap className="w-4 h-4 mr-2" />
                    Auto-fix Issues
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {showDetails && (
          <>
            {/* Issues List */}
            {validationResult.issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Validation Issues
                  </CardTitle>
                  <CardDescription>
                    Issues found during content validation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {validationResult.issues.map((issue) => {
                        const IssueIcon = getIssueIcon(issue.type);
                        const isSelected = autoFixIssues.includes(issue.id);

                        return (
                          <div
                            key={issue.id}
                            className={cn(
                              "border rounded-lg p-4 cursor-pointer transition-all",
                              getIssueColor(issue.type),
                              isSelected && "ring-2 ring-primary"
                            )}
                            onClick={() => toggleIssueSelection(issue.id)}
                          >
                            <div className="flex items-start gap-3">
                              {issue.autoFixable && (
                                <div className="mt-1">
                                  <div className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                                  )}>
                                    {isSelected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                                  </div>
                                </div>
                              )}

                              <IssueIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{issue.message}</h4>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {issue.category}
                                    </Badge>
                                    {issue.autoFixable && (
                                      <Badge variant="secondary" className="text-xs">
                                        Auto-fixable
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <p className="text-sm mt-1">{issue.description}</p>

                                {issue.suggestion && (
                                  <div className="mt-2 p-2 bg-white/50 rounded text-sm">
                                    <strong>Suggestion:</strong> {issue.suggestion}
                                  </div>
                                )}

                                {issue.position && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Line {issue.position.line}, Column {issue.position.column}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Detailed Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Detailed Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="readability" className="w-full">
                  <TabsList>
                    <TabsTrigger value="readability">Readability</TabsTrigger>
                    <TabsTrigger value="structure">Structure</TabsTrigger>
                    <TabsTrigger value="compliance">Compliance</TabsTrigger>
                    <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
                  </TabsList>

                  <TabsContent value="readability" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Average Sentence Length</Label>
                        <div className="text-2xl font-bold">
                          {validationResult.metrics.readability.factors.averageSentenceLength.toFixed(1)}
                        </div>
                        <p className="text-sm text-muted-foreground">words per sentence</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Complexity Score</Label>
                        <div className="text-2xl font-bold">
                          {(validationResult.metrics.readability.factors.complexityScore * 100).toFixed(0)}%
                        </div>
                        <p className="text-sm text-muted-foreground">relative complexity</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="structure" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Heading className="w-4 h-4" />
                          <Label>Headings</Label>
                        </div>
                        <div className="text-2xl font-bold">
                          {validationResult.metrics.structure.headings}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <Label>Sections</Label>
                        </div>
                        <div className="text-2xl font-bold">
                          {validationResult.metrics.structure.sections}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4" />
                          <Label>Tables</Label>
                        </div>
                        <div className="text-2xl font-bold">
                          {validationResult.metrics.structure.tables}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <List className="w-4 h-4" />
                          <Label>Lists</Label>
                        </div>
                        <div className="text-2xl font-bold">
                          {validationResult.metrics.structure.lists}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="compliance" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Template Alignment</span>
                          <span>{validationResult.metrics.compliance.templateAlignment}%</span>
                        </div>
                        <Progress value={validationResult.metrics.compliance.templateAlignment} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Variable Completion</span>
                          <span>{validationResult.metrics.compliance.variableCompletion}%</span>
                        </div>
                        <Progress value={validationResult.metrics.compliance.variableCompletion} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Format Consistency</span>
                          <span>{validationResult.metrics.compliance.formatConsistency}%</span>
                        </div>
                        <Progress value={validationResult.metrics.compliance.formatConsistency} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="accessibility" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          <Label>Alt Text Coverage</Label>
                        </div>
                        <div className="text-2xl font-bold">
                          {validationResult.metrics.accessibility.altTextCoverage}%
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Heading className="w-4 h-4" />
                          <Label>Heading Hierarchy</Label>
                        </div>
                        <div className="text-2xl font-bold">
                          {validationResult.metrics.accessibility.headingHierarchy ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {validationResult.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Potential Improvement</p>
                      <p className="text-sm text-muted-foreground">
                        By addressing all recommendations, you could improve your score by up to
                        <strong> +{validationResult.estimatedImprovement}%</strong>
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {Math.min(100, validationResult.overallScore + validationResult.estimatedImprovement)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}