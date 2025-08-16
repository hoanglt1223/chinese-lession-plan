import React, { createContext, useContext, useState, ReactNode } from "react";
import type { Lesson } from "@shared/schema";

interface WorkflowState {
  currentStep: number;
  completedSteps: number[];
}

interface WorkflowContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  getStepProgress: (lesson: Lesson | null) => WorkflowState;
  isStepCompleted: (step: number, lesson: Lesson | null) => boolean;
  isStepActive: (step: number, lesson: Lesson | null) => boolean;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const getStepProgress = (lesson: Lesson | null): WorkflowState => {
    if (!lesson) {
      return { currentStep: 0, completedSteps: [] };
    }

    const completed: number[] = [];
    let current = 0;

    // Step 0: Input - check if files were uploaded
    if (lesson.originalFiles?.length) {
      completed.push(0);
      current = 1;
    }

    // Step 1: Review - check if AI analysis exists
    if (lesson.aiAnalysis) {
      completed.push(1);
      current = 2;
    }

    // Step 2: Plan - check if lesson plan or lesson plans exist
    if (lesson.lessonPlan || (lesson.lessonPlans && lesson.lessonPlans.length > 0)) {
      completed.push(2);
      current = 3;
    }

    // Step 3: Flashcards - check if flashcards exist
    if (lesson.flashcards?.length) {
      completed.push(3);
      current = 4;
    }

    // Step 4: Summary - check if summary exists
    if (lesson.summary) {
      completed.push(4);
      current = 5; // All steps completed
    }

    return { currentStep: current, completedSteps: completed };
  };

  const isStepCompleted = (step: number, lesson: Lesson | null): boolean => {
    const progress = getStepProgress(lesson);
    return progress.completedSteps.includes(step);
  };

  const isStepActive = (step: number, lesson: Lesson | null): boolean => {
    const progress = getStepProgress(lesson);
    return progress.currentStep === step;
  };

  const value: WorkflowContextType = {
    currentStep,
    setCurrentStep,
    getStepProgress,
    isStepCompleted,
    isStepActive,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflowContext() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error("useWorkflowContext must be used within a WorkflowProvider");
  }
  return context;
}
