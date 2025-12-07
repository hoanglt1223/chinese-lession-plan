import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Toaster } from "@/components/ui/toaster";
import { GenerationWizard } from "@/components/generation/generation-wizard";
import { FileUploader } from "@/components/generation/file-uploader";
import { TemplateSelector } from "@/components/generation/template-selector";
import { LanguageSelector } from "@/components/generation/language-selector";
import { ProgressIndicator, createInitialProgress } from "@/components/generation/progress-indicator";
import { ResultsViewer } from "@/components/generation/results-viewer";
import { FormatValidation } from "@/components/generation/format-validation";
import { ExportOptions } from "@/components/generation/export-options";
import { BatchGeneration } from "@/components/generation/batch-generation";
import { ErrorRecovery } from "@/components/generation/error-recovery";
import * as LucideIcons from "lucide-react";
const {
  Zap,
  FileText,
  Globe,
  BarChart3,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Settings,
  Save,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  Plus,
  Layers,
  AlertTriangle
} = LucideIcons;
import { cn } from "@/lib/utils";

interface GenerationData {
  upload?: any[];
  templates?: any[];
  language?: any;
  progress?: any;
  results?: any[];
}

export default function GenerationDashboard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [generationData, setGenerationData] = useState<GenerationData>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const wizardRef = useRef<any>(null);

  const steps = [
    { id: 'upload', title: 'Upload Files', component: 'upload' },
    { id: 'template', title: 'Select Template', component: 'template' },
    { id: 'language', title: 'Language Settings', component: 'language' },
    { id: 'batch', title: 'Batch Generation', component: 'batch' },
    { id: 'generate', title: 'Generate Content', component: 'generate' },
    { id: 'results', title: 'Review Results', component: 'results' },
    { id: 'export', title: 'Export Content', component: 'export' }
  ];

  const handleStepData = useCallback((stepId: string, data: any) => {
    setGenerationData(prev => ({
      ...prev,
      [stepId]: data
    }));

    // Auto-advance after successful completion
    if (data && stepId !== 'generate' && stepId !== 'results') {
      setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      }, 500);
    }
  }, []);

  const handleStepComplete = useCallback((data: any) => {
    // Complete the wizard flow
    console.log('Generation completed:', data);
  }, []);

  const startGeneration = useCallback(() => {
    setIsGenerating(true);
    const progress = createInitialProgress(generationData.upload || []);
    setGenerationData(prev => ({ ...prev, progress }));

    // Simulate generation completion
    setTimeout(() => {
      setIsGenerating(false);
      setCurrentStep(4); // Move to results

      // Mock generated results
      const mockResults = [
        {
          id: '1',
          type: 'lesson_plan',
          title: 'Interactive Chinese Lesson',
          content: `## Interactive Chinese Lesson Plan

### Learning Objectives
- Students will learn basic Chinese greetings
- Practice pronunciation and tones
- Cultural context introduction

### Activities
1. Warm-up with greeting practice
2. Interactive pronunciation exercises
3. Cultural discussion

### Assessment
- Oral pronunciation check
- Written practice exercises`,
          metadata: {
            wordCount: 150,
            pageCount: 2,
            qualityScore: 92,
            generatedAt: new Date()
          },
          status: 'generated'
        }
      ];

      setGenerationData(prev => ({ ...prev, results: mockResults }));
    }, 3000);
  }, [generationData.upload]);

  const handleExport = useCallback((exportOptions: any) => {
    console.log('Exporting with options:', exportOptions);
    // Implement export functionality
  }, []);

  const navigateToStep = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex);
  }, []);

  const canAdvance = useCallback((stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Upload
        return generationData.upload && generationData.upload.length > 0;
      case 1: // Template
        return generationData.templates && generationData.templates.length > 0;
      case 2: // Language
        return generationData.language;
      case 3: // Batch
        return generationData.upload && generationData.upload.length > 0; // Can batch with uploaded files
      case 4: // Generate
        return true; // Can always try to generate
      case 5: // Results
        return generationData.results && generationData.results.length > 0;
      case 6: // Export
        return generationData.results && generationData.results.length > 0;
      default:
        return false;
    }
  }, [generationData]);

  const renderStepContent = useCallback(() => {
    const step = steps[currentStep];

    switch (step.component) {
      case 'upload':
        return (
          <FileUploader
            onFilesChange={(files) => handleStepData('upload', files)}
            onUploadComplete={(files) => handleStepData('upload', files)}
            multiple={true}
            maxSize={50 * 1024 * 1024}
          />
        );

      case 'template':
        return (
          <TemplateSelector
            onTemplateSelect={(templates) => handleStepData('templates', templates)}
            maxSelection={3}
            showComparison={true}
            selectedTemplates={generationData.templates || []}
          />
        );

      case 'language':
        return (
          <LanguageSelector
            onLanguageChange={(config) => handleStepData('language', config)}
            showAdvanced={true}
            allowMultipleTargets={true}
            initialConfig={generationData.language}
          />
        );

      case 'batch':
        return (
          <BatchGeneration
            onBatchComplete={(batchId, results) => {
              console.log('Batch completed:', batchId, results);
              handleStepData('batch', { completed: true, results });
            }}
            onItemComplete={(itemId, result) => {
              console.log('Item completed:', itemId, result);
            }}
            maxConcurrent={3}
          />
        );

      case 'generate':
        return (
          <div className="space-y-6">
            {/* Generation Status */}
            {isGenerating || generationData.progress ? (
              <ProgressIndicator
                progress={generationData.progress || createInitialProgress([])}
                onPause={() => setIsGenerating(false)}
                onResume={() => setIsGenerating(true)}
                showDetails={true}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="w-16 h-16 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Ready to Generate</h3>
                  <p className="text-muted-foreground mb-6 text-center max-w-md">
                    All files and settings are configured. Start the generation process to create your educational content.
                  </p>
                  <Button onClick={startGeneration} size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Start Generation
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Generation Summary */}
            {(generationData.upload || generationData.templates || generationData.language) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold">{generationData.upload?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Files Uploaded</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Settings className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <div className="text-2xl font-bold">{generationData.templates?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Templates Selected</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Globe className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <div className="text-2xl font-bold">
                        {generationData.language ? '1' : '0'}
                      </div>
                      <div className="text-sm text-muted-foreground">Language Config</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'results':
        return (
          <div className="space-y-6">
            <ResultsViewer
              contents={generationData.results || []}
              onContentUpdate={(contentId, updates) => {
                // Handle content updates
                console.log('Content updated:', contentId, updates);
              }}
              onContentApprove={(contentId) => {
                console.log('Content approved:', contentId);
              }}
              onContentReject={(contentId, reason) => {
                console.log('Content rejected:', contentId, reason);
              }}
              showCompare={true}
              allowEditing={true}
            />

            {generationData.results && generationData.results.length > 0 && (
              <FormatValidation
                content={generationData.results[0].content}
                onValidationComplete={setValidationResult}
                autoValidate={true}
                showDetails={true}
              />
            )}
          </div>
        );

      case 'export':
        return (
          <ExportOptions
            content={generationData.results || []}
            selectedItems={generationData.results?.map(r => r.id) || []}
            onExport={handleExport}
            showAdvanced={true}
            defaultFilename="generated-content"
          />
        );

      default:
        return (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground ml-3">Step content not available</p>
            </CardContent>
          </Card>
        );
    }
  }, [currentStep, generationData, isGenerating, handleStepData, startGeneration, handleExport]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Enhanced Generation Dashboard</h1>
          <p className="text-muted-foreground">
            Create educational content with AI-powered generation, real-time progress, and multi-format export
          </p>
        </div>

        {/* Step Navigation */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Generation Workflow</h2>
              <div className="flex items-center gap-2">
                <Badge variant={currentStep === steps.length - 1 ? "default" : "secondary"}>
                  Step {currentStep + 1} of {steps.length}
                </Badge>
                {generationData.results && generationData.results.length > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => navigateToStep(currentStep - 1)}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2 overflow-x-auto">
                {steps.map((step, index) => (
                  <Button
                    key={step.id}
                    variant={currentStep === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => navigateToStep(index)}
                    disabled={!canAdvance(index) && index > currentStep}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-xs",
                      canAdvance(index) ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {canAdvance(index) ? '✓' : index + 1}
                    </div>
                    <span className="hidden sm:inline">{step.title}</span>
                  </Button>
                ))}
              </div>

              <Button
                onClick={() => navigateToStep(currentStep + 1)}
                disabled={currentStep === steps.length - 1 || !canAdvance(currentStep)}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {generationData.upload && generationData.upload.length > 0 && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Quick Actions</h3>
                  <p className="text-sm text-muted-foreground">
                    {generationData.upload.length} file{generationData.upload.length !== 1 ? 's' : ''} ready for processing
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigateToStep(1)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Templates
                  </Button>
                  {canAdvance(3) && !isGenerating && (
                    <Button onClick={startGeneration}>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Now
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Status Messages */}
        {!canAdvance(currentStep) && currentStep > 0 && (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Please complete the current step before proceeding to the next one.
            </AlertDescription>
          </Alert>
        )}

        {/* Tips */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Tips & Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">📁 File Upload</h4>
                <p className="text-sm text-muted-foreground">
                  Upload PDF, Word, or text files. Max file size: 50MB. Multiple files supported for batch processing.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🎯 Template Selection</h4>
                <p className="text-sm text-muted-foreground">
                  Choose templates that match your educational goals. Use comparison view to select the best option.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🌍 Language Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Configure source and target languages, age groups, and cultural context for better results.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">📊 Quality Check</h4>
                <p className="text-sm text-muted-foreground">
                  Review generated content, check format validation scores, and make edits before exporting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Recovery Section */}
      <ErrorRecovery
        onRetry={(errorId) => {
          console.log('Retrying error:', errorId);
          // Implement retry logic
        }}
        onClear={(errorId) => {
          console.log('Clearing error:', errorId);
          // Implement clear logic
        }}
        onClearAll={() => {
          console.log('Clearing all errors');
          // Implement clear all logic
        }}
        onExportErrors={(errorIds) => {
          console.log('Exporting errors:', errorIds);
          // Implement export logic
        }}
      />

      <Toaster />
    </div>
  );
}