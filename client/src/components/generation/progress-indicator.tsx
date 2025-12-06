import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  Eye,
  Download,
  FileText,
  Zap,
  Brain,
  Image as ImageIcon,
  Loader2,
  TrendingUp,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'paused';
  progress: number;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  details?: {
    processedItems?: number;
    totalItems?: number;
    currentOperation?: string;
    estimatedTimeRemaining?: number;
  };
  substeps?: GenerationStep[];
}

interface GenerationProgress {
  id: string;
  name: string;
  overallProgress: number;
  status: 'pending' | 'running' | 'completed' | 'error' | 'paused';
  startTime?: Date;
  endTime?: Date;
  estimatedDuration?: number;
  steps: GenerationStep[];
  metadata?: {
    totalFiles?: number;
    processedFiles?: number;
    generatedItems?: number;
    creditUsage?: number;
    estimatedCredits?: number;
  };
}

interface ProgressIndicatorProps {
  progress: GenerationProgress;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onViewDetails?: (stepId: string) => void;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function ProgressIndicator({
  progress,
  onPause,
  onResume,
  onRetry,
  onViewDetails,
  showDetails = true,
  compact = false,
  className
}: ProgressIndicatorProps) {
  const [realTimeProgress, setRealTimeProgress] = useState(progress);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Update real-time progress simulation
    if (progress.status === 'running') {
      intervalRef.current = setInterval(() => {
        setRealTimeProgress(prev => {
          const updated = { ...prev };

          // Update overall progress
          if (updated.overallProgress < 100) {
            updated.overallProgress = Math.min(updated.overallProgress + Math.random() * 3, 99);
          }

          // Update steps progress
          updated.steps = updated.steps.map(step => {
            if (step.status === 'running' && step.progress < 100) {
              const newProgress = Math.min(step.progress + Math.random() * 5, step.id === 'generate' ? 95 : 100);
              return {
                ...step,
                progress: newProgress,
                details: {
                  ...step.details,
                  processedItems: Math.floor((newProgress / 100) * (step.details?.totalItems || 10)),
                  estimatedTimeRemaining: Math.max(0, (100 - newProgress) * 2)
                }
              };
            }
            return step;
          });

          return updated;
        });

        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [progress.status]);

  useEffect(() => {
    setRealTimeProgress(progress);
  }, [progress]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'running': return 'text-blue-500';
      case 'error': return 'text-red-500';
      case 'paused': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'running': return Loader2;
      case 'error': return AlertCircle;
      case 'paused': return Pause;
      default: return Clock;
    }
  };

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'extract': return FileText;
      case 'analyze': return Brain;
      case 'template': return FileText;
      case 'generate': return Zap;
      case 'enhance': return ImageIcon;
      default: return Activity;
    }
  };

  const isCompleted = realTimeProgress.status === 'completed';
  const hasError = realTimeProgress.steps.some(step => step.status === 'error');

  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className={cn("w-5 h-5", getStatusColor(realTimeProgress.status), isCompleted && "animate-spin")} />
              {isCompleted && <CheckCircle className="absolute inset-0 w-5 h-5 text-green-500" />}
            </div>
            <div>
              <p className="font-medium">{realTimeProgress.name}</p>
              <p className="text-sm text-muted-foreground">
                {Math.round(realTimeProgress.overallProgress)}% complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isCompleted ? "default" : hasError ? "destructive" : "secondary"}>
              {realTimeProgress.status}
            </Badge>
            {showDetails && (
              <Button variant="ghost" size="sm" onClick={() => onViewDetails?.(realTimeProgress.id)}>
                <Eye className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <Progress value={realTimeProgress.overallProgress} className="h-2" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : hasError ? (
                  <AlertCircle className="w-6 h-6 text-red-500" />
                ) : (
                  <Loader2 className={cn("w-6 h-6 text-blue-500 animate-spin")} />
                )}
              </div>
              <div>
                <CardTitle>{realTimeProgress.name}</CardTitle>
                <CardDescription>
                  {isCompleted ? 'Generation completed successfully' :
                   hasError ? 'Generation encountered errors' :
                   'Generation in progress...'}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={isCompleted ? "default" : hasError ? "destructive" : "secondary"}>
                {realTimeProgress.status}
              </Badge>

              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Timer className="w-4 h-4" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(realTimeProgress.overallProgress)}%</span>
            </div>
            <Progress value={realTimeProgress.overallProgress} className="h-3" />
          </div>

          {/* Metadata */}
          {realTimeProgress.metadata && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {realTimeProgress.metadata.processedFiles || 0}/{realTimeProgress.metadata.totalFiles || 0}
                </div>
                <div className="text-sm text-muted-foreground">Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {realTimeProgress.metadata.generatedItems || 0}
                </div>
                <div className="text-sm text-muted-foreground">Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {realTimeProgress.metadata.creditUsage || 0}/{realTimeProgress.metadata.estimatedCredits || 0}
                </div>
                <div className="text-sm text-muted-foreground">Credits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {realTimeProgress.steps.filter(s => s.status === 'completed').length}/{realTimeProgress.steps.length}
                </div>
                <div className="text-sm text-muted-foreground">Steps</div>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            {realTimeProgress.status === 'running' && onPause && (
              <Button variant="outline" onClick={onPause}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}
            {realTimeProgress.status === 'paused' && onResume && (
              <Button onClick={onResume}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            )}
            {hasError && onRetry && (
              <Button variant="outline" onClick={onRetry}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            {isCompleted && (
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Download Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Steps */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Generation Steps</CardTitle>
            <CardDescription>
              Detailed progress for each generation step
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {realTimeProgress.steps.map((step, index) => {
                  const StepIcon = getStepIcon(step.id);
                  const StatusIcon = getStatusIcon(step.status);

                  return (
                    <div key={step.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            step.status === 'completed' ? "bg-green-100 text-green-600" :
                            step.status === 'running' ? "bg-blue-100 text-blue-600" :
                            step.status === 'error' ? "bg-red-100 text-red-600" :
                            "bg-gray-100 text-gray-600"
                          )}>
                            <StepIcon className="w-4 h-4" />
                          </div>
                          {index < realTimeProgress.steps.length - 1 && (
                            <div className="w-0.5 h-8 bg-border mt-2" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{step.name}</h4>
                              <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={cn("w-4 h-4", getStatusColor(step.status))} />
                              <Badge variant={
                                step.status === 'completed' ? 'default' :
                                step.status === 'error' ? 'destructive' :
                                step.status === 'running' ? 'secondary' : 'outline'
                              }>
                                {step.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Step Progress */}
                          {(step.status === 'running' || step.status === 'completed') && (
                            <div className="mt-3 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{Math.round(step.progress)}%</span>
                              </div>
                              <Progress value={step.progress} className="h-2" />

                              {/* Step Details */}
                              {step.details && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                                  {step.details.processedItems !== undefined && step.details.totalItems && (
                                    <div>
                                      <span className="text-muted-foreground">Items: </span>
                                      <span className="font-medium">
                                        {step.details.processedItems}/{step.details.totalItems}
                                      </span>
                                    </div>
                                  )}
                                  {step.details.estimatedTimeRemaining !== undefined && (
                                    <div>
                                      <span className="text-muted-foreground">ETA: </span>
                                      <span className="font-medium">
                                        {formatTime(step.details.estimatedTimeRemaining)}
                                      </span>
                                    </div>
                                  )}
                                  {step.details.currentOperation && (
                                    <div className="col-span-2">
                                      <span className="text-muted-foreground">Operation: </span>
                                      <span className="font-medium">{step.details.currentOperation}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Error Message */}
                          {step.error && (
                            <Alert variant="destructive" className="mt-3">
                              <AlertCircle className="w-4 h-4" />
                              <AlertDescription>{step.error}</AlertDescription>
                            </Alert>
                          )}

                          {/* Substeps */}
                          {step.substeps && step.substeps.length > 0 && (
                            <div className="mt-3 ml-4 space-y-2">
                              {step.substeps.map(substep => (
                                <div key={substep.id} className="flex items-center gap-2 text-sm">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    substep.status === 'completed' ? "bg-green-500" :
                                    substep.status === 'running' ? "bg-blue-500 animate-pulse" :
                                    substep.status === 'error' ? "bg-red-500" : "bg-gray-300"
                                  )} />
                                  <span className={cn(
                                    substep.status === 'completed' ? "text-foreground" : "text-muted-foreground"
                                  )}>
                                    {substep.name}
                                  </span>
                                  {substep.status === 'running' && (
                                    <span className="text-xs text-muted-foreground">
                                      ({Math.round(substep.progress)}%)
                                    </span>
                                  )}
                                </div>
                              ))}
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
    </div>
  );
}

// Helper function to create initial progress state
export function createInitialProgress(files: any[]): GenerationProgress {
  return {
    id: crypto.randomUUID(),
    name: `Generating content from ${files.length} file${files.length > 1 ? 's' : ''}`,
    overallProgress: 0,
    status: 'pending',
    startTime: new Date(),
    steps: [
      {
        id: 'extract',
        name: 'Extract Content',
        description: 'Extracting text and structure from uploaded files',
        status: 'pending',
        progress: 0,
        details: {
          processedItems: 0,
          totalItems: files.length,
          currentOperation: 'Waiting to start'
        }
      },
      {
        id: 'analyze',
        name: 'Analyze Content',
        description: 'AI-powered content analysis and structure identification',
        status: 'pending',
        progress: 0,
        details: {
          processedItems: 0,
          totalItems: files.length
        }
      },
      {
        id: 'template',
        name: 'Apply Templates',
        description: 'Applying selected generation templates',
        status: 'pending',
        progress: 0
      },
      {
        id: 'generate',
        name: 'Generate Content',
        description: 'AI-powered content generation',
        status: 'pending',
        progress: 0,
        details: {
          processedItems: 0,
          totalItems: 10, // Estimated number of items to generate
          currentOperation: 'Initializing'
        }
      },
      {
        id: 'enhance',
        name: 'Enhance Content',
        description: 'Adding images, formatting, and final touches',
        status: 'pending',
        progress: 0,
        substeps: [
          { id: 'images', name: 'Generate Images', status: 'pending', progress: 0 },
          { id: 'formatting', name: 'Apply Formatting', status: 'pending', progress: 0 },
          { id: 'validation', name: 'Quality Check', status: 'pending', progress: 0 }
        ]
      }
    ],
    metadata: {
      totalFiles: files.length,
      processedFiles: 0,
      generatedItems: 0,
      creditUsage: 0,
      estimatedCredits: files.length * 50 // Estimate 50 credits per file
    }
  };
}