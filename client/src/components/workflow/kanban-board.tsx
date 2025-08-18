import { StepCard } from "./step-card";
import { GlobalExportBar } from "@/components/export/global-export-bar";
import { useWorkflowContext } from "@/contexts/WorkflowContext";
import type { Lesson } from "@shared/schema";

interface KanbanBoardProps {
  selectedLesson: string | null;
  lesson: Lesson | null;
  onLessonSelect: (lessonId: string) => void;
  currentStep: number;
  onStepUpdate: (step: number, data?: any) => Promise<void>;
}

export function KanbanBoard({ 
  selectedLesson, 
  lesson,
  onLessonSelect, 
  currentStep, 
  onStepUpdate 
}: KanbanBoardProps) {
  const { isStepCompleted, isStepAvailable } = useWorkflowContext();
  
  const steps = [
    { id: 0, title: "Input", description: "Upload PDF files" },
    { id: 1, title: "Review", description: "AI analysis" },
    { id: 2, title: "Plan", description: "Generate lesson plan" },
    { id: 3, title: "Flashcards", description: "Create vocabulary cards" },
    { id: 4, title: "Summary", description: "Parent/student summary" }
  ];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            isActive={isStepAvailable(step.id, lesson) && !isStepCompleted(step.id, lesson)}
            isCompleted={isStepCompleted(step.id, lesson)}
            selectedLesson={selectedLesson}
            lesson={lesson}
            onLessonSelect={onLessonSelect}
            onStepUpdate={onStepUpdate}
          />
        ))}
      </div>
      
      {/* Global Export Bar - Fixed position */}
      <GlobalExportBar lesson={lesson} />
    </>
  );
}
