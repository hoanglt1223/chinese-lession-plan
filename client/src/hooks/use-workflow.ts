import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { Workflow } from "@shared/schema";

export function useWorkflow(lessonId: string | null) {
  const [currentStep, setCurrentStep] = useState(0);
  const queryClient = useQueryClient();

  const { data: workflow, isLoading } = useQuery<Workflow>({
    queryKey: ["/api/workflows/lesson", lessonId],
    enabled: !!lessonId,
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ step, data }: { step: number; data?: any }) => {
      if (!workflow?.id) throw new Error("No workflow found");
      
      const currentStepData = workflow.stepData || {};
      const currentCompletedSteps = workflow.completedSteps || [];
      const newCompletedSteps = Array.from(new Set([...currentCompletedSteps, step - 1])).filter(s => s >= 0);
      
      const response = await apiRequest('PATCH', `/api/workflows/${workflow.id}`, {
        currentStep: step,
        stepData: { ...currentStepData, ...data },
        completedSteps: newCompletedSteps
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/lesson", lessonId] });
    }
  });

  useEffect(() => {
    if (workflow) {
      setCurrentStep(workflow.currentStep || 0);
    }
  }, [workflow]);

  const updateStep = async (step: number, data?: any) => {
    setCurrentStep(step);
    await updateWorkflowMutation.mutateAsync({ step, data });
  };

  return {
    workflow,
    currentStep,
    updateStep,
    isLoading,
    isUpdating: updateWorkflowMutation.isPending
  };
}
