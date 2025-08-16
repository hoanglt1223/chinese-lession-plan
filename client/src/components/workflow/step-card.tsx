import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { FlashcardEditor } from "@/components/flashcards/flashcard-editor";
import { VocabularyEditor } from "@/components/vocabulary/vocabulary-editor";
import { useAI } from "@/contexts/AIContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Bot, Loader2, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepCardProps {
  step: Step;
  isActive: boolean;
  isCompleted: boolean;
  selectedLesson: string | null;
  onLessonSelect: (lessonId: string) => void;
  onStepUpdate: (step: number, data?: any) => Promise<void>;
}

export function StepCard({ 
  step, 
  isActive, 
  isCompleted, 
  selectedLesson,
  onLessonSelect,
  onStepUpdate 
}: StepCardProps) {
  const { settings: aiSettings } = useAI();
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [lessonPlan, setLessonPlan] = useState<string>("");
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // DeepL translations 
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  // Simple translation lookup without infinite loops
  const getTranslation = (word: string): string => {
    return translations[word] || word;
  };

  // Trigger DeepL translation when analysis is completed
  const translateVocabulary = async (vocabulary: string[]) => {
    if (vocabulary.length === 0 || isTranslating) return;
    
    try {
      setIsTranslating(true);
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: vocabulary })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTranslations(data.translations);
        console.log('Received DeepL translations:', data.translations);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Translation API error:', response.status, response.statusText, errorData);
        // Show user-friendly error message
        const errorMessage = errorData.message || 'Translation service is unavailable';
        console.warn('Translation failed:', errorMessage);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const getVietnameseActivityTranslation = (activity: string): string => {
    // Return activity as-is, translation should be handled by DeepL API
    return `${activity} (Translation pending...)`;
  };

  const getVietnameseLevelTranslation = (level: string): string => {
    // Return level as-is, translation should be handled by DeepL API
    return `${level} (Translation pending...)`;
  };

  // Initialize state from workflow data if available
  useEffect(() => {
    console.log('StepCard state changed:', { 
      stepId: step.id, 
      analysis: analysis ? 'has data' : 'null',
      vocabularyCount: analysis?.vocabulary?.length || 0,
      isAnalyzing 
    });
  }, [analysis, isAnalyzing, step.id]);
  
  const queryClient = useQueryClient();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: async (data) => {
      try {
        // Create lesson and get analysis
        const lessonResponse = await apiRequest('POST', '/api/lessons', {
          title: `Lesson: ${data.files[0]?.name || 'New Lesson'}`,
          level: "N1",
          ageGroup: "preschool",
          status: "review",
          originalFiles: data.files
        });
        
        const lesson = await lessonResponse.json();
        onLessonSelect(lesson.lesson.id);
        
        // Trigger AI analysis with abort controller
        setIsAnalyzing(true);
        abortControllerRef.current = new AbortController();
        
        const content = data.files.map((f: any) => f.content).join('\n\n');
        const analysisResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content, 
            aiModel: aiSettings.selectedModel,
            outputLanguage: aiSettings.outputLanguage
          }),
          signal: abortControllerRef.current.signal
        });
        
        if (!analysisResponse.ok) throw new Error('Analysis failed');
        const analysisData = await analysisResponse.json();
        
        setAnalysis(analysisData);
        setIsAnalyzing(false);
        
        // Update workflow and invalidate cache to refresh UI
        await onStepUpdate(1, { analysis: analysisData });
        
        // Trigger DeepL translation for vocabulary
        if (analysisData.vocabulary && analysisData.vocabulary.length > 0) {
          translateVocabulary(analysisData.vocabulary);
        }
        
        // Force UI refresh by invalidating all related queries
        queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
        queryClient.invalidateQueries({ queryKey: ['/api/lessons'] });
        queryClient.refetchQueries({ queryKey: ['/api/workflows'] });
        
        console.log('Analysis completed:', analysisData);
        
        // Force re-render by setting state again after a delay
        setTimeout(() => {
          setAnalysis(analysisData);
          console.log('Analysis state updated again:', analysisData);
        }, 100);
        
      } catch (error: any) {
        setIsAnalyzing(false);
        if (error.name !== 'AbortError') {
          console.error('Analysis error:', error);
        }
      }
    }
  });

  // Generate lesson plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const workflowData = selectedLesson ? queryClient.getQueryData(['/api/workflows/lesson', selectedLesson]) : null;
      const currentAnalysis = analysis || (workflowData as any)?.stepData?.analysis;
      console.log('Generating plan with analysis:', currentAnalysis);
      
      const response = await apiRequest('POST', '/api/generate-plan', {
        analysis: currentAnalysis,
        ageGroup: "preschool"
      });
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('Plan generation completed:', data.lessonPlan?.substring(0, 100));
      setLessonPlan(data.lessonPlan);
      await onStepUpdate(2, { lessonPlan: data.lessonPlan });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      queryClient.refetchQueries({ queryKey: ['/api/workflows'] });
    }
  });

  // Generate flashcards mutation
  const generateFlashcardsMutation = useMutation({
    mutationFn: async () => {
      const workflowData = selectedLesson ? queryClient.getQueryData(['/api/workflows/lesson', selectedLesson]) : null;
      const currentAnalysis = analysis || (workflowData as any)?.stepData?.analysis;
      console.log('Generating flashcards with analysis:', currentAnalysis);
      console.log('Vocabulary being used:', currentAnalysis?.vocabulary);
      
      const response = await apiRequest('POST', '/api/generate-flashcards', {
        vocabulary: currentAnalysis?.vocabulary || [],
        theme: currentAnalysis?.mainTheme || 'General Chinese Learning',
        level: currentAnalysis?.detectedLevel || 'Beginner',
        ageGroup: currentAnalysis?.ageAppropriate || 'Primary'
      });
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('Flashcards generated:', data.flashcards?.length);
      setFlashcards(data.flashcards);
      await onStepUpdate(3, { flashcards: data.flashcards });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      queryClient.refetchQueries({ queryKey: ['/api/workflows'] });
    }
  });

  // Generate summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const workflowData = selectedLesson ? queryClient.getQueryData(['/api/workflows/lesson', selectedLesson]) : null;
      const currentAnalysis = analysis || (workflowData as any)?.stepData?.analysis;
      const currentPlan = lessonPlan || (workflowData as any)?.stepData?.lessonPlan;
      console.log('Generating summary with:', { 
        planLength: currentPlan?.length, 
        vocabularyCount: currentAnalysis?.vocabulary?.length 
      });
      
      const response = await apiRequest('POST', '/api/generate-summary', {
        lessonPlan: currentPlan,
        vocabulary: currentAnalysis?.vocabulary || []
      });
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('Summary generated:', data.summary?.substring(0, 100));
      setSummary(data.summary);
      await onStepUpdate(4, { summary: data.summary });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
    }
  });

  const renderStepContent = () => {
    switch (step.id) {
      case 0: // Input
        return (
          <div className="space-y-4">
            <FileUpload
              onFilesChange={setFiles}
              accept=".pdf"
              multiple={true}
            />
            

            
            <Button 
              className="w-full bg-secondary hover:bg-secondary/90"
              onClick={() => uploadMutation.mutate(files)}
              disabled={files.length === 0 || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Files'
              )}
            </Button>
          </div>
        );

      case 1: // Review
        // Check if analysis data exists in any active workflow step
        const workflowAnalysis = selectedLesson ? queryClient.getQueryData(['/api/workflows/lesson', selectedLesson]) : null;
        const analysisData = analysis || (workflowAnalysis as any)?.stepData?.analysis;
        
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Bot className="text-accent w-4 h-4" />
                <span className="text-sm font-medium text-accent">AI Analysis</span>
                {uploadMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {analysisData ? "Analysis completed" : (uploadMutation.isPending || isAnalyzing) ? "Analyzing content with AI... This may take 30-60 seconds" : "Ready for analysis"}
              </p>
              {(uploadMutation.isPending || isAnalyzing) && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Extracting vocabulary and activities...</p>
                  {isAnalyzing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (abortControllerRef.current) {
                          abortControllerRef.current.abort();
                          setIsAnalyzing(false);
                        }
                      }}
                      className="mt-2 h-6 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {analysisData && (
              <div className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium text-foreground mb-1">Detected Level</h4>
                  <Badge variant="secondary">{analysisData.detectedLevel} - {analysisData.ageAppropriate}</Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium text-foreground mb-1">Key Vocabulary (Editable)</h4>
                  <VocabularyEditor
                    vocabulary={analysisData.vocabulary || []}
                    onChange={async (newVocabulary) => {
                      const updatedAnalysis = { ...analysisData, vocabulary: newVocabulary };
                      setAnalysis(updatedAnalysis);
                      
                      // Update the workflow data on backend
                      if (selectedLesson) {
                        try {
                          await onStepUpdate(1, { analysis: updatedAnalysis });
                          
                          // Update the local query cache
                          queryClient.setQueryData(['/api/workflows/lesson', selectedLesson], (old: any) => {
                            if (old?.stepData?.analysis) {
                              return {
                                ...old,
                                stepData: {
                                  ...old.stepData,
                                  analysis: updatedAnalysis
                                }
                              };
                            }
                            return old;
                          });
                          
                          // Invalidate to ensure data consistency
                          queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
                        } catch (error) {
                          console.error('Error updating vocabulary:', error);
                        }
                      }
                    }}
                  />
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium text-foreground mb-1">Learning Activities</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {analysisData.activities?.map((activity: string, index: number) => (
                      <li key={index}>• {activity}</li>
                    ))}
                  </ul>
                </div>
                
                {/* Vietnamese Debug Info */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">🇻🇳 Vietnamese Translation (Debug)</h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-200">Vocabulary:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {analysisData.vocabulary?.map((word: string, index: number) => (
                          <span key={index} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                            {word} ({getTranslation(word) || "Translation pending..."}){getTranslation(word) === word ? " (hardcoded)" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-200">Activities:</span>
                      <ul className="mt-1 space-y-1">
                        {analysisData.activities?.map((activity: string, index: number) => (
                          <li key={index} className="text-blue-700 dark:text-blue-300">
                            • {activity} → {getVietnameseActivityTranslation(activity)} (hardcoded)
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-200">Level:</span>
                      <span className="text-blue-700 dark:text-blue-300 ml-1">
                        {analysisData.detectedLevel} → {getVietnameseLevelTranslation(analysisData.detectedLevel)} (hardcoded)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button 
              className="w-full"
              onClick={() => {
                console.log('Button clicked, analysis:', analysisData);
                // Set the analysis data for the lesson plan generation
                if (analysisData && !analysis) {
                  setAnalysis(analysisData);
                }
                generatePlanMutation.mutate();
              }}
              disabled={!analysisData || generatePlanMutation.isPending || (uploadMutation.isPending || isAnalyzing)}
            >
              {generatePlanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (uploadMutation.isPending || isAnalyzing) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                `Continue to Lesson Plan ${analysisData ? '✓' : '✗'}`
              )}
            </Button>
            
            {/* Debug info */}
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/20 rounded">
              <div>Analysis: {analysisData ? '✓ loaded' : '✗ null'}</div>
              <div>Vocabulary: {analysisData?.vocabulary?.length || 0} words</div>
              <div>Activities: {analysisData?.activities?.length || 0} items</div>
              <div>Button enabled: {(!analysisData || generatePlanMutation.isPending || (uploadMutation.isPending || isAnalyzing)) ? '✗ NO' : '✓ YES'}</div>
            </div>
          </div>
        );

      case 2: // Plan
        // Check for lesson plan in workflow data
        const workflowPlan = selectedLesson ? queryClient.getQueryData(['/api/workflows/lesson', selectedLesson]) : null;
        const planData = lessonPlan || (workflowPlan as any)?.stepData?.lessonPlan;
        
        return (
          <div className="space-y-4">
            {generatePlanMutation.isPending && (
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm font-medium text-accent">Generating Lesson Plan</span>
                </div>
                <p className="text-sm text-muted-foreground">Creating detailed lesson plan with AI... This may take 30-60 seconds</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-accent h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
              </div>
            )}
            
            <MarkdownEditor
              value={planData || ""}
              onChange={(value) => {
                setLessonPlan(value);
                if (value && !lessonPlan) {
                  // Update local state if we got data from workflow
                  console.log('Setting lesson plan from workflow data');
                }
              }}
              placeholder="Lesson plan will be generated here..."
              readOnly={generatePlanMutation.isPending}
            />
            
            {/* Debug info for lesson plan */}
            <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
              <div>Plan data: {planData ? `✓ ${planData.length} chars` : '✗ null'}</div>
              <div>Local state: {lessonPlan ? `✓ ${lessonPlan.length} chars` : '✗ empty'}</div>
              <div>Generation: {generatePlanMutation.isPending ? 'in progress' : 'ready'}</div>
            </div>
            
            {/* Flashcard Generation */}
            {generateFlashcardsMutation.isPending && (
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm font-medium text-accent">Generating Flashcards</span>
                </div>
                <p className="text-sm text-muted-foreground">Creating vocabulary flashcards with AI images...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-accent h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button 
                className="flex-1"
                onClick={() => {
                  // Set analysis for flashcard generation
                  const workflowData = selectedLesson ? queryClient.getQueryData(['/api/workflows/lesson', selectedLesson]) : null;
                  const currentAnalysis = analysis || (workflowData as any)?.stepData?.analysis;
                  if (currentAnalysis && !analysis) {
                    setAnalysis(currentAnalysis);
                  }
                  generateFlashcardsMutation.mutate();
                }}
                disabled={!planData || generateFlashcardsMutation.isPending}
              >
                {generateFlashcardsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Flashcards → Step 3'
                )}
              </Button>
            </div>
          </div>
        );

      case 3: // Flashcards
        // Check for flashcards in workflow data
        const workflowFlashcards = selectedLesson ? queryClient.getQueryData(['/api/workflows/lesson', selectedLesson]) : null;
        const flashcardsData = flashcards.length > 0 ? flashcards : (workflowFlashcards as any)?.stepData?.flashcards || [];
        
        // Get vocabulary from analysis for editing
        const workflowData = selectedLesson ? queryClient.getQueryData(['/api/workflows/lesson', selectedLesson]) : null;
        const currentAnalysis = analysis || (workflowData as any)?.stepData?.analysis;
        const vocabularyList = currentAnalysis?.vocabulary || [];
        
        return (
          <div className="space-y-4">
            {/* Vocabulary Editor */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  Edit Vocabulary Words
                </span>
              </div>
              <div className="p-4">
                <VocabularyEditor
                  vocabulary={vocabularyList}
                  onChange={(newVocabulary) => {
                    // Update analysis with new vocabulary
                    if (currentAnalysis) {
                      const updatedAnalysis = { ...currentAnalysis, vocabulary: newVocabulary };
                      setAnalysis(updatedAnalysis);
                      
                      // Update workflow data
                      if (selectedLesson && workflowData) {
                        queryClient.setQueryData(['/api/workflows/lesson', selectedLesson], {
                          ...workflowData,
                          stepData: {
                            ...(workflowData as any).stepData,
                            analysis: updatedAnalysis
                          }
                        });
                      }
                    }
                  }}
                />
                
                <Button 
                  className="w-full mt-3"
                  onClick={() => {
                    if (vocabularyList.length > 0) {
                      generateFlashcardsMutation.mutate();
                    }
                  }}
                  disabled={vocabularyList.length === 0 || generateFlashcardsMutation.isPending}
                >
                  {generateFlashcardsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Flashcards...
                    </>
                  ) : (
                    `Generate Flashcards (${vocabularyList.length} words)`
                  )}
                </Button>
              </div>
            </div>

            {generateFlashcardsMutation.isPending && (
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm font-medium text-accent">Generating Flashcards</span>
                </div>
                <p className="text-sm text-muted-foreground">Creating vocabulary flashcards... This may take 10-20 seconds</p>
              </div>
            )}
            
            {flashcardsData.length > 0 && (
              <FlashcardEditor
                flashcards={flashcardsData}
                onChange={(cards) => {
                  setFlashcards(cards);
                  if (cards.length > 0 && flashcards.length === 0) {
                    console.log('Setting flashcards from workflow data:', cards.length);
                  }
                }}
              />
            )}
            
            {/* Debug info for flashcards */}
            <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
              <div>Vocabulary: {vocabularyList.length > 0 ? `✓ ${vocabularyList.length} words` : '✗ empty'}</div>
              <div>Flashcard data: {flashcardsData.length > 0 ? `✓ ${flashcardsData.length} cards` : '✗ empty'}</div>
              <div>Local state: {flashcards.length > 0 ? `✓ ${flashcards.length} cards` : '✗ empty'}</div>
              <div>Generation: {generateFlashcardsMutation.isPending ? 'in progress' : 'ready'}</div>
            </div>
            
            <Button 
              className="w-full"
              onClick={() => {
                // Set analysis and lesson plan for summary generation
                const currentPlan = lessonPlan || (workflowData as any)?.stepData?.lessonPlan;
                if (currentAnalysis && !analysis) setAnalysis(currentAnalysis);
                if (currentPlan && !lessonPlan) setLessonPlan(currentPlan);
                generateSummaryMutation.mutate();
              }}
              disabled={flashcardsData.length === 0 || generateSummaryMutation.isPending}
            >
              {generateSummaryMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Summary'
              )}
            </Button>
          </div>
        );

      case 4: // Summary
        // Check for summary in workflow data
        const workflowSummary = selectedLesson ? queryClient.getQueryData(['/api/workflows/lesson', selectedLesson]) : null;
        const summaryData = summary || (workflowSummary as any)?.stepData?.summary || "";
        
        return (
          <div className="space-y-4">
            {generateSummaryMutation.isPending && (
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm font-medium text-accent">Generating Summary</span>
                </div>
                <p className="text-sm text-muted-foreground">Creating parent/student summary... This may take 10-20 seconds</p>
              </div>
            )}
            
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">Parent/Student Summary</span>
              </div>
              <div className="p-4 h-64 overflow-y-auto text-xs">
                <pre className="whitespace-pre-wrap text-foreground">
                  {summaryData || "Summary will be generated here..."}
                </pre>
              </div>
            </div>
            
            {/* Debug info for summary */}
            <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
              <div>Summary data: {summaryData ? `✓ ${summaryData.length} chars` : '✗ empty'}</div>
              <div>Local state: {summary ? `✓ ${summary.length} chars` : '✗ empty'}</div>
              <div>Generation: {generateSummaryMutation.isPending ? 'in progress' : 'ready'}</div>
            </div>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Vietnamese translations included</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>QR code for audio content</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn(
      "workflow-step kanban-card",
      isActive && "active",
      isCompleted && "completed"
    )}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className={cn(
            "step-indicator",
            isActive ? "active" : isCompleted ? "completed" : "pending"
          )}>
            {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.id}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{step.title}</h3>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        </div>
        
        {renderStepContent()}
      </CardContent>
    </Card>
  );
}
