import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  List,
  Shield,
  FileText,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'syntax' | 'variable' | 'structure' | 'content' | 'accessibility';
  message: string;
  line?: number;
  column?: number;
  position?: number;
  suggestion?: string;
  autoFixable?: boolean;
}

export interface ValidationScore {
  overall: number; // 0-100
  syntax: number;
  variables: number;
  structure: number;
  content: number;
  accessibility: number;
}

interface TemplateValidatorProps {
  content: string;
  variables?: string[];
  onValidationComplete?: (result: ValidationResult) => void;
  onAutoFix?: (issueId: string) => void;
  className?: string;
  showDetails?: boolean;
  autoValidate?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  score: ValidationScore;
  issues: ValidationIssue[];
  statistics: {
    totalVariables: number;
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    autoFixable: number;
  };
}

export function TemplateValidator({
  content,
  variables = [],
  onValidationComplete,
  onAutoFix,
  className,
  showDetails = true,
  autoValidate = true
}: TemplateValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Auto-validate when content changes
  useEffect(() => {
    if (autoValidate && content) {
      validateTemplate();
    }
  }, [content, variables, autoValidate]);

  const validateTemplate = async () => {
    setIsValidating(true);

    // Simulate async validation
    await new Promise(resolve => setTimeout(resolve, 500));

    const issues = analyzeContent(content, variables);
    const score = calculateScore(issues, variables);
    const statistics = calculateStatistics(issues, variables);

    const result: ValidationResult = {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      score,
      issues,
      statistics
    };

    setValidationResult(result);
    onValidationComplete?.(result);
    setIsValidating(false);
  };

  const analyzeContent = (content: string, variables: string[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Syntax validation
    issues.push(...validateSyntax(content));

    // Variable validation
    issues.push(...validateVariables(content, variables));

    // Structure validation
    issues.push(...validateStructure(content));

    // Content quality validation
    issues.push(...validateContentQuality(content));

    // Accessibility validation
    issues.push(...validateAccessibility(content));

    return issues;
  };

  const validateSyntax = (content: string): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Check for unmatched braces
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
      issues.push({
        id: 'unmatched-braces',
        type: 'error',
        category: 'syntax',
        message: `Unmatched template braces: ${openBraces} opening, ${closeBraces} closing`,
        suggestion: 'Check for missing or extra braces in template variables',
        autoFixable: false
      });
    }

    // Check for empty variables
    const emptyVariables = content.match(/\{\{\s*\}\}/g);
    if (emptyVariables) {
      emptyVariables.forEach((match, index) => {
        const position = content.indexOf(match, index > 0 ? content.indexOf(match) + match.length : 0);
        issues.push({
          id: `empty-variable-${index}`,
          type: 'error',
          category: 'variable',
          message: 'Empty template variable found',
          position,
          suggestion: 'Add variable name inside braces',
          autoFixable: true
        });
      });
    }

    // Check for invalid variable names
    const invalidVariables = content.match(/\{\{[^a-zA-Z_][^}]*\}\}/g);
    if (invalidVariables) {
      invalidVariables.forEach((match, index) => {
        const position = content.indexOf(match, index > 0 ? content.indexOf(match) + match.length : 0);
        issues.push({
          id: `invalid-variable-name-${index}`,
          type: 'error',
          category: 'variable',
          message: `Invalid variable name: ${match}`,
          position,
          suggestion: 'Variable names should start with a letter or underscore',
          autoFixable: false
        });
      });
    }

    return issues;
  };

  const validateVariables = (content: string, variables: string[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const contentVariables = (content.match(/\{\{([^}]+)\}\}/g) || [])
      .map(match => match.replace(/[{}]/g, '').trim());

    // Check for undefined variables
    contentVariables.forEach(variableName => {
      if (!variables.includes(variableName)) {
        issues.push({
          id: `undefined-variable-${variableName}`,
          type: 'warning',
          category: 'variable',
          message: `Variable "${variableName}" is used but not defined`,
          suggestion: 'Define the variable or check if it should be removed',
          autoFixable: false
        });
      }
    });

    // Check for unused variables
    variables.forEach(variableName => {
      if (!contentVariables.includes(variableName)) {
        issues.push({
          id: `unused-variable-${variableName}`,
          type: 'info',
          category: 'variable',
          message: `Variable "${variableName}" is defined but not used`,
          suggestion: 'Remove the unused variable or use it in the template',
          autoFixable: true
        });
      }
    });

    return issues;
  };

  const validateStructure = (content: string): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Check content length
    if (content.length < 10) {
      issues.push({
        id: 'content-too-short',
        type: 'warning',
        category: 'structure',
        message: 'Template content is very short',
        suggestion: 'Add more meaningful content to the template',
        autoFixable: false
      });
    }

    if (content.length > 50000) {
      issues.push({
        id: 'content-too-long',
        type: 'warning',
        category: 'structure',
        message: 'Template content is very long (>50KB)',
        suggestion: 'Consider splitting into smaller templates for better performance',
        autoFixable: false
      });
    }

    // Check for markdown structure
    if (content.includes('#')) {
      const headers = content.match(/^#+\s.*$/gm) || [];
      if (headers.length === 0) {
        issues.push({
          id: 'missing-headers',
          type: 'info',
          category: 'structure',
          message: 'No markdown headers found',
          suggestion: 'Add headers to improve document structure',
          autoFixable: false
        });
      }
    }

    return issues;
  };

  const validateContentQuality = (content: string): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Check for placeholder text
    const placeholders = ['lorem ipsum', 'placeholder', 'TODO', 'FIXME', 'XXX'];
    placeholders.forEach(placeholder => {
      if (content.toLowerCase().includes(placeholder.toLowerCase())) {
        issues.push({
          id: `placeholder-${placeholder}`,
          type: 'warning',
          category: 'content',
          message: `Placeholder text found: "${placeholder}"`,
          suggestion: 'Replace placeholder text with actual content',
          autoFixable: false
        });
      }
    });

    // Check for repetitive content
    const lines = content.split('\n');
    const repeatedLines = lines.filter((line, index) =>
      lines.indexOf(line) !== index && line.trim().length > 10
    );

    if (repeatedLines.length > 0) {
      issues.push({
        id: 'repeated-content',
        type: 'info',
        category: 'content',
        message: `${repeatedLines.length} repeated lines found`,
        suggestion: 'Consider if repeated content is intentional',
        autoFixable: false
      });
    }

    return issues;
  };

  const validateAccessibility = (content: string): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Check for alt text suggestions in images
    if (content.includes('![') && content.includes('](')) {
      const imagesWithoutAlt = content.match(/!\[\s*\]\(/g);
      if (imagesWithoutAlt) {
        issues.push({
          id: 'missing-alt-text',
          type: 'warning',
          category: 'accessibility',
          message: 'Images found without alt text',
          suggestion: 'Add descriptive alt text for accessibility',
          autoFixable: false
        });
      }
    }

    return issues;
  };

  const calculateScore = (issues: ValidationIssue[], variables: string[]): ValidationScore => {
    const errors = issues.filter(i => i.type === 'error').length;
    const warnings = issues.filter(i => i.type === 'warning').length;
    const totalIssues = issues.length;

    const baseScore = 100;
    const errorPenalty = errors * 20;
    const warningPenalty = warnings * 5;
    const finalScore = Math.max(0, baseScore - errorPenalty - warningPenalty);

    const categoryScores = {
      syntax: calculateCategoryScore(issues, 'syntax'),
      variables: calculateCategoryScore(issues, 'variable'),
      structure: calculateCategoryScore(issues, 'structure'),
      content: calculateCategoryScore(issues, 'content'),
      accessibility: calculateCategoryScore(issues, 'accessibility')
    };

    return {
      overall: finalScore,
      ...categoryScores
    };
  };

  const calculateCategoryScore = (issues: ValidationIssue[], category: ValidationIssue['category']): number => {
    const categoryIssues = issues.filter(i => i.category === category);
    const errors = categoryIssues.filter(i => i.type === 'error').length;
    const warnings = categoryIssues.filter(i => i.type === 'warning').length;

    const baseScore = 100;
    const errorPenalty = errors * 25;
    const warningPenalty = warnings * 10;

    return Math.max(0, baseScore - errorPenalty - warningPenalty);
  };

  const calculateStatistics = (issues: ValidationIssue[], variables: string[]) => {
    return {
      totalVariables: variables.length,
      totalIssues: issues.length,
      errors: issues.filter(i => i.type === 'error').length,
      warnings: issues.filter(i => i.type === 'warning').length,
      info: issues.filter(i => i.type === 'info').length,
      autoFixable: issues.filter(i => i.autoFixable).length
    };
  };

  const filteredIssues = useMemo(() => {
    if (!selectedCategory || !validationResult) return validationResult?.issues || [];
    return validationResult.issues.filter(issue => issue.category === selectedCategory);
  }, [validationResult, selectedCategory]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Very Poor';
  };

  const categories = [
    { key: 'syntax', label: 'Syntax', icon: <FileText className="h-4 w-4" /> },
    { key: 'variable', label: 'Variables', icon: <Zap className="h-4 w-4" /> },
    { key: 'structure', label: 'Structure', icon: <List className="h-4 w-4" /> },
    { key: 'content', label: 'Content', icon: <FileText className="h-4 w-4" /> },
    { key: 'accessibility', label: 'Accessibility', icon: <Shield className="h-4 w-4" /> }
  ];

  if (!showDetails && validationResult) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {validationResult.isValid ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm">
          Score: <span className={cn('font-medium', getScoreColor(validationResult.score.overall))}>
            {validationResult.score.overall}%
          </span>
        </span>
        {validationResult.statistics.errors > 0 && (
          <Badge variant="destructive" className="text-xs">
            {validationResult.statistics.errors} errors
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Template Validator
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={validateTemplate}
          disabled={isValidating}
        >
          {isValidating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Revalidate
        </Button>
      </div>

      {validationResult && (
        <>
          {/* Overall Score */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Quality Score</span>
              <span className={cn('text-2xl font-bold', getScoreColor(validationResult.score.overall))}>
                {validationResult.score.overall}%
              </span>
            </div>
            <Progress value={validationResult.score.overall} className="h-2" />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">
                {getScoreLabel(validationResult.score.overall)}
              </span>
              <div className="flex gap-2">
                {validationResult.isValid ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Invalid
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Category Scores */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {categories.map(({ key, label, icon }) => (
              <div key={key} className="text-center">
                <div className="flex justify-center mb-1">{icon}</div>
                <div className="text-xs font-medium">{label}</div>
                <div className={cn('text-lg font-bold', getScoreColor(validationResult.score[key as keyof ValidationScore]))}>
                  {validationResult.score[key as keyof ValidationScore]}%
                </div>
              </div>
            ))}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold">{validationResult.statistics.totalIssues}</div>
              <div className="text-xs text-muted-foreground">Total Issues</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-semibold text-red-600">{validationResult.statistics.errors}</div>
              <div className="text-xs text-red-600">Errors</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-lg font-semibold text-yellow-600">{validationResult.statistics.warnings}</div>
              <div className="text-xs text-yellow-600">Warnings</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600">{validationResult.statistics.autoFixable}</div>
              <div className="text-xs text-blue-600">Auto-fixable</div>
            </div>
          </div>

          {/* Issues List */}
          {filteredIssues.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Issues</h4>
                <div className="flex gap-1">
                  {categories.map(({ key, label }) => {
                    const count = validationResult.issues.filter(i => i.category === key).length;
                    if (count === 0) return null;
                    return (
                      <Button
                        key={key}
                        variant={selectedCategory === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                        className="text-xs"
                      >
                        {label} ({count})
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredIssues.map((issue) => (
                  <Alert key={issue.id} className={cn(
                    'py-3',
                    issue.type === 'error' && 'border-red-200 bg-red-50',
                    issue.type === 'warning' && 'border-yellow-200 bg-yellow-50',
                    issue.type === 'info' && 'border-blue-200 bg-blue-50'
                  )}>
                    <div className="flex items-start gap-2">
                      {issue.type === 'error' && <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                      {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                      {issue.type === 'info' && <Info className="h-4 w-4 text-blue-600 mt-0.5" />}

                      <div className="flex-1 min-w-0">
                        <AlertDescription className="text-sm">
                          <div className="font-medium">{issue.message}</div>
                          {issue.suggestion && (
                            <div className="text-xs text-muted-foreground mt-1">
                              💡 {issue.suggestion}
                            </div>
                          )}
                          {issue.autoFixable && onAutoFix && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onAutoFix(issue.id)}
                              className="mt-2 text-xs h-6"
                            >
                              Auto-fix
                            </Button>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {filteredIssues.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No issues found!</p>
              <p className="text-sm">Your template looks good to go.</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}