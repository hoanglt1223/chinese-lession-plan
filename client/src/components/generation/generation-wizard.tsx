import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check, FileUpload, Layers, Activity, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface GenerationWizardProps {
  children?: React.ReactNode;
  onComplete?: (data: any) => void;
  className?: string;
}

export function GenerationWizard({ children, onComplete, className }: GenerationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [stepData, setStepData] = useState<Record<string, any>>({});

  const steps: WizardStep[] = [
    {
      id: 'upload',
      title: 'Upload Files',
      description: 'Select and upload source files for generation',
      icon: FileUpload,
      status: currentStep === 0 ? 'active' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'template',
      title: 'Select Template',
      description: 'Choose or compare generation templates',
      icon: Layers,
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'configure',
      title: 'Configure Options',
      description: 'Set language, format, and generation parameters',
      icon: Activity,
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'generate',
      title: 'Generate Content',
      description: 'Review progress and monitor generation',
      icon: Activity,
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending'
    },
    {
      id: 'review',
      title: 'Review & Export',
      description: 'Preview, edit, and export generated content',
      icon: Eye,
      status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'pending'
    }
  ];

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
      onComplete?.(stepData);
    }
  }, [currentStep, stepData, onComplete, steps.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepData = useCallback((stepId: string, data: any) => {
    setStepData(prev => ({
      ...prev,
      [stepId]: data
    }));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  }, [steps.length]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn("w-full max-w-6xl mx-auto space-y-6", className)}>
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Enhanced Generation Dashboard</CardTitle>
              <CardDescription>
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
              </CardDescription>
            </div>
            {isCompleted && (
              <Badge variant="default" className="bg-green-500">
                <Check className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />

            {/* Step Navigation */}
            <div className="flex flex-wrap gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Button
                    key={step.id}
                    variant={index === currentStep ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToStep(index)}
                    className="flex items-center gap-2"
                    disabled={step.status === 'pending' && index !== 0}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{step.title}</span>
                    {step.status === 'completed' && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                    {step.status === 'error' && (
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card className="min-h-[500px]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              currentStep + 1 <= steps.length ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              {currentStep + 1}
            </div>
            <div>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {children ? (
            // Pass step data and handlers to children
            React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                  stepId: steps[currentStep].id,
                  stepData: stepData[steps[currentStep].id],
                  onStepData: (data: any) => handleStepData(steps[currentStep].id, data),
                  isActive: currentStep === steps.findIndex(s => s.id === child.props.stepId)
                });
              }
              return child;
            })
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <FileUpload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Step content will appear here</p>
                <p className="text-sm">Current step: {steps[currentStep].id}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep === steps.length - 1 ? (
              <Button onClick={handleNext}>
                <Download className="w-4 h-4 mr-2" />
                Complete Generation
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Quick Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const hasData = stepData[step.id] && Object.keys(stepData[step.id]).length > 0;

              return (
                <div key={step.id} className="flex flex-col items-center text-center p-2 rounded-lg border">
                  <Icon className={cn(
                    "w-6 h-6 mb-1",
                    hasData ? "text-green-500" : "text-muted-foreground"
                  )} />
                  <span className="font-medium">{step.title}</span>
                  <Badge
                    variant={hasData ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {hasData ? "Ready" : "Pending"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}