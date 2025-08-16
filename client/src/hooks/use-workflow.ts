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
    queryFn: async () => {
      if (!lessonId) throw new Error("No lesson ID");
      
      const response = await apiRequest('POST', '/api/lessons', {
        action: 'get',
        lessonId: lessonId
      });
      return response.json();
    },
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
      
      console.log('🚀 updateStep mutation - Step:', step, 'Data keys:', Object.keys(data || {}));
      console.log('🚀 updateStep mutation - lessonId:', lessonId);
      
      // Update lesson with the new data using body parameters
      const response = await apiRequest('PUT', '/api/lessons', {
        id: lessonId,
        ...data
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ PUT request failed:', response.status, errorText);
        throw new Error(`PUT request failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ updateStep mutation successful:', result);
      return result;
    },
    onSuccess: (result) => {
      console.log('✅ updateStep onSuccess - invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    },
    onError: (error) => {
      console.error('❌ updateStep mutation error:', error);
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
