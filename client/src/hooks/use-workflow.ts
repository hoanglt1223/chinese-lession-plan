import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useWorkflowContext } from "@/contexts/WorkflowContext";
import type { Lesson } from "@shared/schema";

export function useWorkflow(lessonId: string | null) {
  const queryClient = useQueryClient();
  const { getStepProgress, setCurrentStep } = useWorkflowContext();

  // Get lesson data instead of workflow data
  const { data: lesson, isLoading } = useQuery<Lesson>({
    queryKey: ["/api/lessons", lessonId],
    enabled: !!lessonId,
  });

  // Calculate workflow state from lesson data
  const workflowState = getStepProgress(lesson || null);
  const currentStep = workflowState.currentStep;
  const completedSteps = workflowState.completedSteps;

  // Update lesson data when steps are completed
  const updateStepMutation = useMutation({
    mutationFn: async ({ step, data }: { step: number; data?: any }) => {
      if (!lessonId) throw new Error("No lesson ID provided");
      
      // Update lesson with the new data
      const response = await apiRequest('PUT', `/api/lessons/${lessonId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    }
  });

  const updateStep = async (step: number, data?: any) => {
    setCurrentStep(step);
    if (data) {
      await updateStepMutation.mutateAsync({ step, data });
    }
  };

  return {
    lesson,
    currentStep,
    completedSteps,
    updateStep,
    isLoading,
    isUpdating: updateStepMutation.isPending
  };
}
