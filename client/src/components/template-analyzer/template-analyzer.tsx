import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Button } from '../ui/button.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.js';
import { Badge } from '../ui/badge.js';
import { Progress } from '../ui/progress.js';
import { ScrollArea } from '../ui/scroll-area.js';
import { Alert, AlertDescription } from '../ui/alert.js';
import { Textarea } from '../ui/textarea.js';
import { Label } from '../ui/label.js';
import { Switch } from '../ui/switch.js';
import { Separator } from '../ui/separator.js';
import {
  FileText,
  Search,
  BarChart3,
  Languages,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Eye,
  EyeOff,
  Download,
  Upload,
  Settings,
  Copy,
  Compare
} from 'lucide-react';

import {
  analyzeTemplate,
  detectVariables,
  extractStructure,
  detectLanguages,
  assessQuality,
  compareTemplates,
  getQualityGrade,
  getQualityColor,
  getQualityBgColor,
  formatVariableType,
  formatLanguageName,
  formatComplexity,
  truncateText
} from '../../lib/template-analyzer.js';

import type {
  TemplateAnalysis,
  Variable,
  AnalysisOptions,
  ValidationResult,
  TemplateStructure
} from '../../../../shared/schema.js';

interface TemplateAnalyzerProps {
  initialContent?: string;
  onAnalysisComplete?: (analysis: TemplateAnalysis) => void;
}

export function TemplateAnalyzer({ initialContent = '', onAnalysisComplete }: TemplateAnalyzerProps) {
  const [content, setContent] = useState(initialContent);
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [structure, setStructure] = useState<TemplateStructure | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  const [options, setOptions] = useState<AnalysisOptions>({
    detectLanguage: true,
    extractVariables: true,
    analyzeStructure: true,
    scoreQuality: true,
    targetLanguages: ['chinese', 'vietnamese', 'english']
  });

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeTemplate({
        content,
        options
      });

      setAnalysis(result.analysis);
      setValidation(result.validation);
      setStructure(result.structure);
      setActiveTab('overview');
      onAnalysisComplete?.(result.analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [content, options, onAnalysisComplete]);

  const handleQuickVariableDetection = useCallback(async () => {
    if (!content.trim()) return;

    try {
      const result = await detectVariables({ content });
      console.log('Detected variables:', result.variables);
    } catch (error) {
      console.error('Variable detection failed:', error);
    }
  }, [content]);

  const handleCompare = useCallback(async () => {
    const template2 = prompt('Enter second template content to compare:');
    if (!template2 || !content.trim()) return;

    try {
      const result = await compareTemplates({
        template1: content,
        template2
      });

      console.log('Comparison result:', result);
    } catch (error) {
      console.error('Comparison failed:', error);
    }
  }, [content]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const exportAnalysis = useCallback(() => {
    if (!analysis || !validation || !structure) return;

    const exportData = {
      content,
      analysis,
      validation,
      structure,
      options,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [analysis, validation, structure, content, options]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Analysis Engine</h1>
          <p className="text-muted-foreground">
            Intelligent analysis of template structure, variables, and quality
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('template-file-input')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <input
            id="template-file-input"
            type="file"
            accept=".txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  setContent(event.target?.result as string);
                };
                reader.readAsText(file);
              }
            }}
          />
          {analysis && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportAnalysis}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="overview" disabled={!analysis}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="variables" disabled={!analysis}>
            Variables
          </TabsTrigger>
          <TabsTrigger value="structure" disabled={!analysis}>
            Structure
          </TabsTrigger>
          <TabsTrigger value="quality" disabled={!analysis}>
            Quality
          </TabsTrigger>
          <TabsTrigger value="languages" disabled={!analysis}>
            Languages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
              <CardDescription>
                Enter or paste your template content for analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-content">Template Content</Label>
                <Textarea
                  id="template-content"
                  placeholder="Enter your template content here... Supports {{variable}} syntax, markdown tables, and multiple languages."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{content.length} characters</span>
                  <span>{content.split(/\s+/).filter(w => w).length} words</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="detect-language"
                    checked={options.detectLanguage}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, detectLanguage: checked }))
                    }
                  />
                  <Label htmlFor="detect-language">Detect Languages</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="extract-variables"
                    checked={options.extractVariables}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, extractVariables: checked }))
                    }
                  />
                  <Label htmlFor="extract-variables">Extract Variables</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="analyze-structure"
                    checked={options.analyzeStructure}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, analyzeStructure: checked }))
                    }
                  />
                  <Label htmlFor="analyze-structure">Analyze Structure</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="score-quality"
                    checked={options.scoreQuality}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, scoreQuality: checked }))
                    }
                  />
                  <Label htmlFor="score-quality">Score Quality</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAnalyze}
                  disabled={!content.trim() || isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Analyze Template
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleQuickVariableDetection}
                  disabled={!content.trim()}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Quick Variables
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCompare}
                  disabled={!content.trim()}
                >
                  <Compare className="h-4 w-4 mr-2" />
                  Compare
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          {analysis && validation && structure && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getQualityColor(analysis.quality.overall)}`}>
                      {analysis.quality.overall}/100
                    </div>
                    <p className={`text-xs ${getQualityColor(analysis.quality.overall)}`}>
                      Grade {getQualityGrade(analysis.quality.overall)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Variables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysis.variables.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {analysis.variables.filter(v => v.required).length} required
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Complexity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatComplexity(structure.complexity)}</div>
                    <p className="text-xs text-muted-foreground">
                      {structure.estimatedWordCount} words
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Languages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1 flex-wrap">
                      {analysis.languages.map((lang) => (
                        <Badge key={lang.language} variant="secondary" className="text-xs">
                          {formatLanguageName(lang.language)}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Validation Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Completeness Score</span>
                      <div className="flex items-center gap-2">
                        <Progress value={validation.score} className="w-24" />
                        <span className="text-sm font-medium">{validation.score}%</span>
                      </div>
                    </div>

                    {validation.missingVariables.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Missing required variables: {validation.missingVariables.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}

                    {validation.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Recommendations:</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {validation.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Info className="h-3 w-3 mt-1 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validation.isValid && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Template validation passed! All required variables are provided.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quality Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analysis.quality).map(([key, value]) => {
                      if (key === 'issues') return null;
                      const metricKey = key as keyof typeof analysis.quality;
                      if (typeof value !== 'number') return null;

                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className="capitalize font-medium">{key}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={value} className="w-24" />
                            <span className={`text-sm font-medium ${getQualityColor(value)}`}>
                              {Math.round(value)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Detected Variables</CardTitle>
                <CardDescription>
                  {analysis.variables.length} variables found in the template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.variables.length === 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        No variables detected in this template.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid gap-4">
                      {analysis.variables.map((variable, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                                  {variable.pattern}
                                </code>
                                <Badge variant={variable.required ? 'destructive' : 'secondary'}>
                                  {variable.required ? 'Required' : 'Optional'}
                                </Badge>
                                <Badge variant="outline">
                                  {formatVariableType(variable.type)}
                                </Badge>
                              </div>

                              {variable.description && (
                                <p className="text-sm text-muted-foreground">
                                  {variable.description}
                                </p>
                              )}

                              {variable.defaultValue !== undefined && (
                                <p className="text-sm">
                                  Default: <code className="px-1 py-0.5 bg-muted rounded">
                                    {variable.defaultValue}
                                  </code>
                                </p>
                              )}

                              {variable.examples && variable.examples.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium">Examples: </span>
                                  {variable.examples.map((example, i) => (
                                    <code key={i} className="px-1 py-0.5 bg-muted rounded mr-1">
                                      {example}
                                    </code>
                                  ))}
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(variable.name)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="structure" className="space-y-4">
          {analysis && structure && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Headings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysis.structure.headings.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysis.structure.tables.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Lists</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysis.structure.lists.length}</div>
                  </CardContent>
                </Card>
              </div>

              {analysis.structure.headings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Document Structure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {analysis.structure.headings.map((heading, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded"
                            style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
                          >
                            <span className="text-sm font-mono text-muted-foreground">
                              H{heading.level}
                            </span>
                            <span className="text-sm">{heading.text}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {analysis.structure.tables.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.structure.tables.map((table, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Table {index + 1}</span>
                            <span>{table.rowCount} rows × {table.columnCount} columns</span>
                            {table.hasHeader && (
                              <Badge variant="secondary">Has Header</Badge>
                            )}
                          </div>
                          <div className="overflow-x-auto">
                            <div
                              className="border rounded text-xs font-mono p-2 bg-muted/50"
                              dangerouslySetInnerHTML={{
                                __html: table.markdown.replace(/\n/g, '<br>')
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {structure.sections.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {structure.sections.map((section, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Level {section.level}</Badge>
                            <h4 className="font-medium">{section.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {truncateText(section.content, 200)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          {analysis && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Quality Assessment</CardTitle>
                  <CardDescription>
                    Overall score: <span className={`font-bold ${getQualityColor(analysis.quality.overall)}`}>
                      {analysis.quality.overall}/100 ({getQualityGrade(analysis.quality.overall)})
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(analysis.quality).map(([key, value]) => {
                      if (key === 'issues') return null;
                      const metricKey = key as keyof typeof analysis.quality;
                      if (typeof value !== 'number') return null;

                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">{key}</span>
                            <span className={`font-bold ${getQualityColor(value)}`}>
                              {Math.round(value)}%
                            </span>
                          </div>
                          <Progress value={value} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {analysis.quality.issues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Issues & Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.quality.issues.map((issue, index) => (
                        <Alert key={index} className={
                          issue.type === 'error' ? 'border-red-200 bg-red-50' :
                          issue.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                          'border-blue-200 bg-blue-50'
                        }>
                          {issue.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                          {issue.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                          {issue.type === 'info' && <Info className="h-4 w-4 text-blue-600" />}
                          <AlertDescription>
                            <div className="space-y-1">
                              <p className={issue.type === 'error' ? 'text-red-800' :
                                          issue.type === 'warning' ? 'text-yellow-800' :
                                          'text-blue-800'}>
                                {issue.message}
                              </p>
                              {issue.suggestion && (
                                <p className="text-sm opacity-75">
                                  💡 {issue.suggestion}
                                </p>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="languages" className="space-y-4">
          {analysis && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Language Detection</CardTitle>
                  <CardDescription>
                    Detected languages and content distribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {analysis.languages.map((language) => (
                      <div key={language.language} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Languages className="h-4 w-4" />
                            <span className="font-medium">
                              {formatLanguageName(language.language)}
                            </span>
                            <Badge variant="outline">
                              {language.confidence.toFixed(1)}% confidence
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {language.characterCount} chars • {language.wordCount} words
                          </div>
                        </div>

                        <Progress value={language.confidence} className="h-2" />

                        {language.patterns.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Sample Patterns:</h5>
                            <div className="flex gap-1 flex-wrap">
                              {language.patterns.slice(0, 5).map((pattern, index) => (
                                <code key={index} className="px-2 py-1 bg-muted rounded text-xs">
                                  {truncateText(pattern, 20)}
                                </code>
                              ))}
                              {language.patterns.length > 5 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{language.patterns.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <Separator />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {analysis.languages.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Multilingual Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        This template contains content in multiple languages. Consider using clear language markers
                        or separating content for better organization and consistency.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <input
        type="file"
        accept=".txt,.md"
        style={{ display: 'none' }}
        id="hidden-file-input"
      />
    </div>
  );
}