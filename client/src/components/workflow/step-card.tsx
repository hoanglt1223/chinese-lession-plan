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
import type { Lesson } from "@shared/schema";

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
  lesson: Lesson | null;
  onLessonSelect: (lessonId: string) => void;
  onStepUpdate: (step: number, data?: any) => Promise<void>;
}

export function StepCard({ 
  step, 
  isActive, 
  isCompleted, 
  selectedLesson,
  lesson,
  onLessonSelect,
  onStepUpdate 
}: StepCardProps) {
  const { settings: aiSettings } = useAI();
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [lessonPlans, setLessonPlans] = useState<Array<{
    lessonNumber: number;
    title: string;
    type: string;
    content: string;
    filename: string;
  }>>([]);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<Array<{
    lessonNumber: number;
    title: string;
    content: string;
    filename: string;
  }>>([]);
  const [selectedSummaryIndex, setSelectedSummaryIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Consolidated translation state
  const [allTranslations, setAllTranslations] = useState<{
    vocabulary: Record<string, string>;
    activities: Record<string, string>;
    levels: Record<string, string>;
  }>({
    vocabulary: {},
    activities: {},
    levels: {}
  });
  const [isTranslating, setIsTranslating] = useState(false);

  // Consolidated translation getters
  const getVocabularyTranslation = (word: string): string => {
    return allTranslations.vocabulary[word] || word;
  };
  
  const getActivityTranslation = (activity: string): string => {
    return allTranslations.activities[activity] || activity;
  };
  
  const getLevelTranslation = (level: string): string => {
    return allTranslations.levels[level] || level;
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
        setAllTranslations(prev => ({
          ...prev,
          vocabulary: { ...prev.vocabulary, ...data.translations }
        }));
        console.log('Received vocabulary translations:', data.translations);
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

  const translateActivities = async (activities: string[]) => {
    if (activities.length === 0) return;
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: activities })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllTranslations(prev => ({
          ...prev,
          activities: { ...prev.activities, ...data.translations }
        }));
        console.log('Received activity translations:', data.translations);
      } else {
        console.error('Activity translation API error:', response.status);
      }
    } catch (error) {
      console.error('Activity translation error:', error);
    }
  };

  const translateLevel = async (level: string) => {
    if (!level) return;
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: [level] })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllTranslations(prev => ({
          ...prev,
          levels: { ...prev.levels, ...data.translations }
        }));
        console.log('Received level translation:', data.translations);
      } else {
        console.error('Level translation API error:', response.status);
      }
    } catch (error) {
      console.error('Level translation error:', error);
    }
  };

  const translateText = async (text: string): Promise<string> => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: [text] })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.translations[text] || text;
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
    return text;
  };



  // Translate analysis data when it becomes available
  useEffect(() => {
    if (analysis) {
      // Translate vocabulary
      if (analysis.vocabulary && analysis.vocabulary.length > 0) {
        translateVocabulary(analysis.vocabulary);
      }
      
      // Translate activities
      if (analysis.activities && analysis.activities.length > 0) {
        translateActivities(analysis.activities);
      }
      
      // Translate level
      if (analysis.detectedLevel) {
        translateLevel(analysis.detectedLevel);
      }
    }
  }, [analysis]);

  // Step 1: Initialize analysis from lesson data
  useEffect(() => {
    if (lesson?.aiAnalysis && !analysis) {
      console.log('Step 1 useEffect: Initializing analysis from lesson data');
      setAnalysis(lesson.aiAnalysis);
    }
  }, [lesson?.id, lesson?.aiAnalysis, analysis]);

  // Step 2: Initialize lesson plans from lesson data  
  useEffect(() => {
    if (lesson?.lessonPlans?.length && lessonPlans.length === 0) {
      console.log('Step 2 useEffect: Initializing lessonPlans from lesson data:', lesson.lessonPlans.length);
      setLessonPlans(lesson.lessonPlans);
    }
  }, [lesson?.id, lesson?.lessonPlans, lessonPlans.length]);

  // Step 3: Initialize flashcards from lesson data
  useEffect(() => {
    if (lesson?.flashcards?.length && flashcards.length === 0) {
      console.log('Step 3 useEffect: Initializing flashcards from lesson data:', lesson.flashcards.length);
      setFlashcards(lesson.flashcards);
    }
  }, [lesson?.id, lesson?.flashcards, flashcards.length]);

  // Step 4: Initialize summaries from lesson data
  useEffect(() => {
    if (lesson?.summaries?.length && summaries.length === 0) {
      console.log('Step 4 useEffect: Initializing summaries from lesson data:', lesson.summaries.length);
      setSummaries(lesson.summaries);
    }
  }, [lesson?.id, lesson?.summaries, summaries.length]);

  // Reset selected indexes when data changes
  useEffect(() => {
    if (lessonPlans.length > 0 && selectedLessonIndex >= lessonPlans.length) {
      setSelectedLessonIndex(0);
    }
  }, [lessonPlans.length, selectedLessonIndex]);

  useEffect(() => {
    if (summaries.length > 0 && selectedSummaryIndex >= summaries.length) {
      setSelectedSummaryIndex(0);
    }
  }, [summaries.length, selectedSummaryIndex]);

  // Clear local state when lesson ID changes (but not when lesson becomes null)
  const [previousLessonId, setPreviousLessonId] = useState<string | null>(null);
  
  useEffect(() => {
    const currentLessonId = lesson?.id || null;
    
    // Only clear state if we're switching to a different lesson (not on updates to same lesson)
    if (previousLessonId && currentLessonId && previousLessonId !== currentLessonId) {
      console.log('Lesson switched, resetting local state from', previousLessonId, 'to', currentLessonId);
      setAnalysis(null);
      setLessonPlans([]);
      setFlashcards([]);
      setSummaries([]);
      setSelectedLessonIndex(0);
      setSelectedSummaryIndex(0);
    }
    
    setPreviousLessonId(currentLessonId);
  }, [lesson?.id, previousLessonId]);
  
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
        await onStepUpdate(1, { aiAnalysis: analysisData });
        
        // Trigger DeepL translation for vocabulary
        if (analysisData.vocabulary && analysisData.vocabulary.length > 0) {
          translateVocabulary(analysisData.vocabulary);
        }
        
        // Translate activities and level
        if (analysisData.activities && analysisData.activities.length > 0) {
          translateActivities(analysisData.activities);
        }
        
        if (analysisData.detectedLevel) {
          translateLevel(analysisData.detectedLevel);
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
      const currentAnalysis = analysis || lesson?.aiAnalysis;
      console.log('Generating plan with analysis:', currentAnalysis);
      
      const response = await apiRequest('POST', '/api/generate-plan', {
        analysis: currentAnalysis,
        ageGroup: "preschool"
      });
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('Plan generation completed:', data.fullPlan?.substring(0, 100));
      console.log('Individual lessons:', data.lessonPlans?.length);
      console.log('Full response data:', data);
      
      // Set the new format
      if (data.lessonPlans && data.lessonPlans.length > 0) {
        setLessonPlans(data.lessonPlans);
        console.log('Setting lessonPlans state:', data.lessonPlans.length, 'lessons');
        console.log('Individual lessons:', data.lessonPlans.map((l: any) => `${l.lessonNumber}: ${l.title} (${l.type})`));
      } else {
        console.log('No lessonPlans found in response');
      }
      
      console.log('Post-update state - lessonPlans local:', lessonPlans.length);
      
      // Update lesson with new format
      await onStepUpdate(2, { 
        lessonPlans: data.lessonPlans
      });
      
      console.log('Updated lesson with new data, triggering state refresh');
      
      // Force query invalidation to refresh lesson data
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", selectedLesson] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    }
  });

  // Generate flashcards mutation
  const generateFlashcardsMutation = useMutation({
    mutationFn: async () => {
      const currentAnalysis = analysis || lesson?.aiAnalysis;
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
    }
  });

  // Generate summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const currentAnalysis = analysis || lesson?.aiAnalysis;
      // Use full plan from lessonPlans array
      const currentPlan = lessonPlans.length > 0 
        ? lessonPlans.map(l => l.content).join('\n\n')
        : lesson?.lessonPlans?.map(l => l.content).join('\n\n') || '';
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
      console.log('Summary generated:', data.fullSummary?.substring(0, 100));
      console.log('Individual summaries:', data.summaries?.length);
      console.log('Full summary response:', data);
      
      // Set the new format
      if (data.summaries && data.summaries.length > 0) {
        setSummaries(data.summaries);
        console.log('Setting summaries state:', data.summaries.length, 'summaries');
      } else {
        console.log('No summaries found in response');
      }
      
      // Update lesson with new format
      await onStepUpdate(4, { 
        summaries: data.summaries
      });
      
      console.log('Updated lesson with new summary data');
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
        // Get analysis data from lesson or local state
        const analysisData = analysis || lesson?.aiAnalysis;
        
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
                      
                      // Update the lesson data on backend
                      if (selectedLesson) {
                        try {
                          await onStepUpdate(1, { aiAnalysis: updatedAnalysis });
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
                            {word} ({getVocabularyTranslation(word) || "Translation pending..."}){getVocabularyTranslation(word) === word ? " (hardcoded)" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-200">Activities:</span>
                      <ul className="mt-1 space-y-1">
                        {analysisData.activities?.map((activity: string, index: number) => (
                          <li key={index} className="text-blue-700 dark:text-blue-300">
                            • {activity} → {getActivityTranslation(activity)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-200">Level:</span>
                      <span className="text-blue-700 dark:text-blue-300 ml-1">
                        {analysisData.detectedLevel} → {getLevelTranslation(analysisData.detectedLevel)}
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
        // Get lesson plans - prioritize local state if it has data, otherwise use lesson data
        const plansData = lessonPlans.length > 0 ? lessonPlans : (lesson?.lessonPlans || []);
        console.log('Step 2 render - local lessonPlans:', lessonPlans.length, 'lesson.lessonPlans:', lesson?.lessonPlans?.length || 0, 'using plansData:', plansData.length);
        
        
        return (
          <div className="space-y-4">
            {generatePlanMutation.isPending && (
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm font-medium text-accent">Generating 4-Lesson Plan</span>
                </div>
                <p className="text-sm text-muted-foreground">Creating detailed 4-lesson unit plan with AI... This may take 60-90 seconds</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-accent h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
              </div>
            )}
            
            {/* Display individual lesson plans if available */}
            {plansData.length > 0 ? (
              <div className="space-y-4">
                {/* Lesson selector tabs */}
                <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                  {plansData.map((plan, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedLessonIndex(index)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedLessonIndex === index
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      Lesson {plan.lessonNumber}: {plan.title}
                      <span className="ml-2 text-xs opacity-70">({plan.type})</span>
                    </button>
                  ))}
                </div>
                
                {/* Selected lesson content */}
                {plansData[selectedLessonIndex] && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        {plansData[selectedLessonIndex].filename}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        {plansData[selectedLessonIndex].type}
                      </div>
                    </div>
                    
                    <MarkdownEditor
                      value={plansData[selectedLessonIndex].content}
                      onChange={(value) => {
                        const updatedPlans = [...plansData];
                        updatedPlans[selectedLessonIndex] = {
                          ...updatedPlans[selectedLessonIndex],
                          content: value
                        };
                        setLessonPlans(updatedPlans);
                      }}
                      placeholder="Individual lesson plan content..."
                      readOnly={generatePlanMutation.isPending}
                    />
                  </div>
                )}
                
                {/* Summary info */}
                <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
                  <div>Individual lessons: {plansData.length}/4</div>
                  <div>Current lesson: {plansData[selectedLessonIndex]?.filename || 'None'}</div>
                  <div>Content: {plansData[selectedLessonIndex]?.content.length || 0} chars</div>
                  <div>Local state: {lessonPlans.length} | Lesson object: {lesson?.lessonPlans?.length || 0}</div>
                </div>
                
                {/* Debug sync button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log('Manual sync - lesson.lessonPlans:', lesson?.lessonPlans?.length);
                    console.log('Manual sync - lessonPlans state:', lessonPlans.length);
                    if (lesson?.lessonPlans && lesson.lessonPlans.length > 0) {
                      setLessonPlans(lesson.lessonPlans);
                      console.log('Manually synced lessonPlans');
                    }
                  }}
                  className="text-xs"
                >
                  Debug: Sync State
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No lesson plans available. Generate lesson plans to view them here.</p>
              </div>
            )}
            
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
                  const currentAnalysis = analysis || lesson?.aiAnalysis;
                  if (currentAnalysis && !analysis) {
                    setAnalysis(currentAnalysis);
                  }
                  generateFlashcardsMutation.mutate();
                }}
                disabled={plansData.length === 0 || generateFlashcardsMutation.isPending}
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
        // Get flashcards from lesson or local state
        const flashcardsData = flashcards.length > 0 ? flashcards : lesson?.flashcards || [];
        
        // Get vocabulary from analysis for editing
        const currentAnalysis = analysis || lesson?.aiAnalysis;
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
                  onChange={async (newVocabulary) => {
                    // Update analysis with new vocabulary
                    if (currentAnalysis) {
                      const updatedAnalysis = { ...currentAnalysis, vocabulary: newVocabulary };
                      setAnalysis(updatedAnalysis);
                      
                      // Update lesson data
                      if (selectedLesson) {
                        try {
                          await onStepUpdate(3, { aiAnalysis: updatedAnalysis });
                        } catch (error) {
                          console.error('Error updating vocabulary:', error);
                        }
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
                // Set analysis for summary generation
                if (currentAnalysis && !analysis) setAnalysis(currentAnalysis);
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
        // Get summaries from lesson or local state
        const summariesData = summaries.length > 0 ? summaries : (lesson?.summaries || []);
        
        
        return (
          <div className="space-y-4">
            {generateSummaryMutation.isPending && (
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm font-medium text-accent">Generating 4 Lesson Summaries</span>
                </div>
                <p className="text-sm text-muted-foreground">Creating individual parent/student summaries... This may take 30-45 seconds</p>
              </div>
            )}
            
            {/* Display individual lesson summaries if available */}
            {summariesData.length > 0 ? (
              <div className="space-y-4">
                {/* Summary selector tabs */}
                <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                  {summariesData.map((summaryItem, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSummaryIndex(index)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedSummaryIndex === index
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      Lesson {summaryItem.lessonNumber}: {summaryItem.title}
                    </button>
                  ))}
                </div>
                
                {/* Selected summary content */}
                {summariesData[selectedSummaryIndex] && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        {summariesData[selectedSummaryIndex].filename}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        Parent/Student Summary
                      </div>
                    </div>
                    
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 border-b border-border">
                        <span className="text-xs font-medium text-muted-foreground">
                          Lesson {summariesData[selectedSummaryIndex].lessonNumber} Summary - {summariesData[selectedSummaryIndex].title}
                        </span>
                      </div>
                      <div className="p-4 h-64 overflow-y-auto text-xs">
                        <pre className="whitespace-pre-wrap text-foreground">
                          {summariesData[selectedSummaryIndex].content}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Summary info */}
                <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
                  <div>Individual summaries: {summariesData.length}/4</div>
                  <div>Current summary: {summariesData[selectedSummaryIndex]?.filename || 'None'}</div>
                  <div>Content: {summariesData[selectedSummaryIndex]?.content.length || 0} chars</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No summaries available. Generate summaries to view them here.</p>
              </div>
            )}
            
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
