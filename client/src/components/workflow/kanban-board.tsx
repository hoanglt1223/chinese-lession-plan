import { StepCard } from "./step-card";

interface KanbanBoardProps {
  selectedLesson: string | null;
  onLessonSelect: (lessonId: string) => void;
  currentStep: number;
  onStepUpdate: (step: number, data?: any) => Promise<void>;
}

export function KanbanBoard({ 
  selectedLesson, 
  onLessonSelect, 
  currentStep, 
  onStepUpdate 
}: KanbanBoardProps) {
  const steps = [
    { id: 0, title: "Input", description: "Upload PDF files" },
    { id: 1, title: "Review", description: "AI analysis" },
    { id: 2, title: "Plan", description: "Generate lesson plan" },
    { id: 3, title: "Flashcards", description: "Create vocabulary cards" },
    { id: 4, title: "Summary", description: "Parent/student summary" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {steps.map((step) => (
        <StepCard
          key={step.id}
          step={step}
          isActive={step.id === currentStep}
          isCompleted={step.id < currentStep}
          selectedLesson={selectedLesson}
          onLessonSelect={onLessonSelect}
          onStepUpdate={onStepUpdate}
        />
      ))}
    </div>
  );
}
