import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ExportBar } from "@/components/export/export-bar";
import { KanbanBoard } from "@/components/workflow/kanban-board";
import { useWorkflow } from "@/hooks/use-workflow";
import { WorkflowProvider } from "@/contexts/WorkflowContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useAI } from "@/contexts/AIContext";
import { GraduationCap, Clock, FolderInput, Layers, Settings, Zap, Loader2, LogOut, DollarSign, Menu, Home, BookOpen, PenTool, FileText } from "lucide-react";

function HomeContent() {
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { lesson, currentStep, updateStep } = useWorkflow(selectedLesson);
  const { user } = useAuth();
  const { settings: aiSettings, updateModel, updateLanguage } = useAI();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      return response.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
  });
  
  const { data: lessons } = useQuery({
    queryKey: ["/api/course-ops?action=lessons"],
    enabled: true,
  });

  const recentLessons = Array.isArray(lessons) ? lessons.slice(0, 4) : [];
  const totalSteps = 5; // Total workflow steps

  // Handler functions
  const handleSelectLesson = (lessonId: string) => {
    setSelectedLesson(lessonId);
  };

  const handleExportLesson = async (lessonId: string) => {
    try {
      // Find the lesson to export
      const lessonToExport = Array.isArray(lessons) ? lessons.find(l => l.id === lessonId) : null;
      
      if (!lessonToExport) {
        console.error('Lesson not found for export:', lessonId);
        return;
      }

      // Use the same export logic as GlobalExportBar
      const exports = [];

      // Export analysis results if available
      if (lessonToExport.aiAnalysis) {
        exports.push(exportAnalysisData(lessonToExport.aiAnalysis));
      }

      // Export lesson plans if available
      if (lessonToExport.lessonPlans && Array.isArray(lessonToExport.lessonPlans) && lessonToExport.lessonPlans.length > 0) {
        exports.push(exportLessonPlans(lessonToExport.lessonPlans));
      }

      // Export flashcards if available
      if (lessonToExport.flashcards && Array.isArray(lessonToExport.flashcards) && lessonToExport.flashcards.length > 0) {
        exports.push(exportFlashcardsData(lessonToExport.flashcards));
      }

      // Export summaries if available
      if (lessonToExport.summaries && Array.isArray(lessonToExport.summaries) && lessonToExport.summaries.length > 0) {
        exports.push(exportSummaries(lessonToExport.summaries));
      }

      if (exports.length === 0) {
        console.log('No exportable data found in lesson:', lessonId);
        return;
      }

      // Execute all exports in parallel
      await Promise.all(exports);
      console.log('Successfully exported lesson:', lessonId);
    } catch (error) {
      console.error('Error exporting lesson:', error);
    }
  };

  // Helper function to download files
  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Helper function to export analysis data
  const exportAnalysisData = async (analysisData: any) => {
    // Export as DOCX
    const docxResponse = await fetch('/api/content-ops?action=export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        documentType: 'docx',
        content: formatAnalysisForExport(analysisData),
        step: 1
      }),
    });

    if (docxResponse.ok) {
      const docxBlob = await docxResponse.blob();
      downloadFile(docxBlob, 'analysis_results.docx');
    }

    // Export as MD
    const mdContent = formatAnalysisForMarkdown(analysisData);
    const mdBlob = new Blob([mdContent], { type: 'text/markdown' });
    downloadFile(mdBlob, 'analysis_results.md');

    // Export as PDF
    const pdfResponse = await fetch('/api/content-ops?action=export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        documentType: 'pdf',
        analysisData,
        step: 1
      }),
    });

    if (pdfResponse.ok) {
      const pdfBlob = await pdfResponse.blob();
      downloadFile(pdfBlob, 'analysis_results.pdf');
    }
  };

  // Helper function to export lesson plans
  const exportLessonPlans = async (lessonPlans: any[]) => {
    // Export each lesson plan as DOCX and MD
    const exportPromises = lessonPlans.map(async (lessonPlan) => {
      // DOCX export
      const docxResponse = await fetch('/api/content-ops?action=export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentType: 'docx',
          content: lessonPlan.content || 'No content available',
          step: 2,
          singleLesson: true
        }),
      });

      if (docxResponse.ok) {
        const docxBlob = await docxResponse.blob();
        const filename = `${lessonPlan.filename || `lesson_${lessonPlan.lessonNumber || 'unknown'}`}.docx`;
        downloadFile(docxBlob, filename);
      }

      // MD export
      const mdContent = `# Lesson ${lessonPlan.lessonNumber || 'Unknown'}: ${lessonPlan.title || 'Untitled'}\n\n**Type:** ${lessonPlan.type || 'N/A'}\n\n${lessonPlan.content || 'No content available'}`;
      const mdBlob = new Blob([mdContent], { type: 'text/markdown' });
      const mdFilename = `${lessonPlan.filename || `lesson_${lessonPlan.lessonNumber || 'unknown'}`}.md`;
      downloadFile(mdBlob, mdFilename);
    });

    await Promise.all(exportPromises);
  };

  // Helper function to export flashcards data
  const exportFlashcardsData = async (flashcards: any[]) => {
    const pdfResponse = await fetch('/api/content-ops?action=export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        documentType: 'pdf',
        flashcards,
        step: 3
      }),
    });

    if (pdfResponse.ok) {
      const pdfBlob = await pdfResponse.blob();
      downloadFile(pdfBlob, 'flashcards.pdf');
    }
  };

  // Helper function to export summaries
  const exportSummaries = async (summaries: any[]) => {
    const exportPromises = summaries.map(async (summary) => {
      // DOCX export
      const docxResponse = await fetch('/api/content-ops?action=export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentType: 'docx',
          content: summary.content || 'No content available',
          step: 4,
          singleSummary: true
        }),
      });

      if (docxResponse.ok) {
        const docxBlob = await docxResponse.blob();
        const filename = `${summary.filename || `summary_${summary.lessonNumber || 'unknown'}`}.docx`;
        downloadFile(docxBlob, filename);
      }

      // MD export
      const mdContent = `# Lesson ${summary.lessonNumber || 'Unknown'}: ${summary.title || 'Untitled'}\n\n${summary.content || 'No content available'}`;
      const mdBlob = new Blob([mdContent], { type: 'text/markdown' });
      const mdFilename = `${summary.filename || `summary_${summary.lessonNumber || 'unknown'}`}.md`;
      downloadFile(mdBlob, mdFilename);
    });

    await Promise.all(exportPromises);
  };

  // Helper function to format analysis data for export
  const formatAnalysisForExport = (analysisData: any) => {
    let content = 'Analysis Results\n\n';
    content += `Detected Level: ${analysisData.detectedLevel || 'N/A'}\n`;
    content += `Age Appropriate: ${analysisData.ageAppropriate || 'N/A'}\n`;
    content += `Main Theme: ${analysisData.mainTheme || 'N/A'}\n\n`;
    
    if (analysisData.vocabulary && analysisData.vocabulary.length > 0) {
      content += 'Vocabulary:\n';
      analysisData.vocabulary.forEach((word: string) => {
        content += `- ${word}\n`;
      });
      content += '\n';
    }
    
    if (analysisData.activities && analysisData.activities.length > 0) {
      content += 'Learning Activities:\n';
      analysisData.activities.forEach((activity: string) => {
        content += `- ${activity}\n`;
      });
    }
    
    return content;
  };

  // Helper function to format analysis data for markdown
  const formatAnalysisForMarkdown = (analysisData: any) => {
    let content = '# Analysis Results\n\n';
    content += `**Detected Level:** ${analysisData.detectedLevel || 'N/A'}\n`;
    content += `**Age Appropriate:** ${analysisData.ageAppropriate || 'N/A'}\n`;
    content += `**Main Theme:** ${analysisData.mainTheme || 'N/A'}\n\n`;
    
    if (analysisData.vocabulary && analysisData.vocabulary.length > 0) {
      content += '## Vocabulary\n';
      analysisData.vocabulary.forEach((word: string) => {
        content += `- ${word}\n`;
      });
      content += '\n';
    }
    
    if (analysisData.activities && analysisData.activities.length > 0) {
      content += '## Learning Activities\n';
      analysisData.activities.forEach((activity: string) => {
        content += `- ${activity}\n`;
      });
    }
    
    return content;
  };

  const handleQuickTestFlow = () => {
    quickStartMutation.mutate();
  };

  const handleBatchProcess = async () => {
    try {
      if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
        console.log('No lessons available for batch processing');
        return;
      }

      console.log(`Starting batch process for ${lessons.length} lessons`);
      
      // Process each lesson that has incomplete steps
      const batchPromises = lessons.map(async (lesson) => {
        try {
          // Check if lesson needs processing (has files but missing analysis/plans/etc)
          const needsProcessing = lesson.files && lesson.files.length > 0 && (
            !lesson.aiAnalysis || 
            !lesson.lessonPlans || 
            !lesson.flashcards || 
            !lesson.summaries
          );

          if (!needsProcessing) {
            console.log(`Lesson ${lesson.id} already processed, skipping`);
            return;
          }

          console.log(`Processing lesson ${lesson.id}`);

          // Step 1: Generate analysis if missing
          if (!lesson.aiAnalysis && lesson.files && lesson.files.length > 0) {
            const analysisResponse = await fetch('/api/ai-ops?action=analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lessonId: lesson.id,
                files: lesson.files,
                model: aiSettings.selectedModel,
                outputLanguage: aiSettings.outputLanguage
              }),
            });

            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              console.log(`Analysis completed for lesson ${lesson.id}`);
            }
          }

          // Step 2: Generate lesson plans if missing
          if (!lesson.lessonPlans && lesson.aiAnalysis) {
            const plansResponse = await fetch('/api/ai-ops?action=generate-plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lessonId: lesson.id,
                analysisData: lesson.aiAnalysis,
                model: aiSettings.selectedModel,
                outputLanguage: aiSettings.outputLanguage
              }),
            });

            if (plansResponse.ok) {
              const plansData = await plansResponse.json();
              console.log(`Lesson plans generated for lesson ${lesson.id}`);
            }
          }

          // Step 3: Generate flashcards if missing
          if (!lesson.flashcards && lesson.aiAnalysis) {
            const flashcardsResponse = await fetch('/api/ai-ops?action=generate-flashcards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lessonId: lesson.id,
                vocabulary: lesson.aiAnalysis.vocabulary || [],
                model: aiSettings.selectedModel,
                outputLanguage: aiSettings.outputLanguage
              }),
            });

            if (flashcardsResponse.ok) {
              const flashcardsData = await flashcardsResponse.json();
              console.log(`Flashcards generated for lesson ${lesson.id}`);
            }
          }

          // Step 4: Generate summaries if missing
          if (!lesson.summaries && lesson.lessonPlans) {
            const summariesResponse = await fetch('/api/ai-ops?action=generate-summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lessonId: lesson.id,
                lessonPlans: lesson.lessonPlans,
                model: aiSettings.selectedModel,
                outputLanguage: aiSettings.outputLanguage
              }),
            });

            if (summariesResponse.ok) {
              const summariesData = await summariesResponse.json();
              console.log(`Summaries generated for lesson ${lesson.id}`);
            }
          }

          console.log(`Completed processing lesson ${lesson.id}`);
        } catch (error) {
          console.error(`Error processing lesson ${lesson.id}:`, error);
        }
      });

      // Execute all batch processes in parallel (with some concurrency limit)
      const BATCH_SIZE = 3; // Process 3 lessons at a time to avoid overwhelming the API
      for (let i = 0; i < batchPromises.length; i += BATCH_SIZE) {
        const batch = batchPromises.slice(i, i + BATCH_SIZE);
        await Promise.all(batch);
        console.log(`Completed batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(batchPromises.length / BATCH_SIZE)}`);
      }

      // Refresh the lessons data after batch processing
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      console.log('Batch processing completed successfully');
    } catch (error) {
      console.error('Error during batch processing:', error);
    }
  };

  const handleSettings = () => {
    setIsSettingsOpen(true);
  };

  // Quick action to auto-load input.pdf and start workflow
  const quickStartMutation = useMutation({
    mutationFn: async () => {
      // First, fetch the input.pdf file from the attached assets
      const response = await fetch('/attached_assets/input.pdf');
      const blob = await response.blob();
      
      // Create a File object to mimic the upload
      const file = new File([blob], 'input.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('files', file);
      
      // Upload the file
      const uploadResponse = await fetch('/api/content-ops?action=upload', {
        method: 'POST',
        body: formData,
      });
      const uploadResult = await uploadResponse.json();
      
      // Create a lesson with required fields
      const lessonResponse = await apiRequest('POST', '/api/course-ops?action=update-lesson', {
        lessonId: 'quick-test-' + Date.now(), // Temporary ID since create is not supported
        title: `Quick Test: ${uploadResult.files[0].name}`,
        level: 'N5',
        ageGroup: 'primary',
        status: 'draft'
      });
      const lessonData = await lessonResponse.json();
      
      // Start analysis immediately
      const analysisResponse = await apiRequest('POST', '/api/ai-ops?action=analyze', {
        content: uploadResult.files[0].content
      });
      const analysisData = await analysisResponse.json();
      
      // Update lesson with analysis
      await apiRequest('POST', '/api/course-ops?action=update-lesson', {
        lessonId: lessonData.lesson?.id || lessonData.id,
        aiAnalysis: analysisData
      });
      
      return { lessonId: lessonData.lesson?.id || lessonData.id, analysis: analysisData };
    },
    onSuccess: (data) => {
      setSelectedLesson(data.lessonId);
      queryClient.invalidateQueries({ queryKey: ['/api/course-ops?action=lessons'] });
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="export-bar border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-6">
          {/* Main header row */}
          <div className="flex items-center justify-between h-12 sm:h-14">
            {/* Logo and brand */}
            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="text-primary-foreground w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg lg:text-xl font-bold text-foreground truncate">
                    EduFlow
                  </h1>
                  <p className="text-xs text-muted-foreground hidden md:block truncate">
                    Chinese Lesson Planning Assistant
                  </p>
                </div>
              </div>
            </div>
            
            {/* User info and actions */}
            <nav className="flex items-center space-x-1 sm:space-x-2">
              {/* User credit balance - hidden on mobile */}
              {user && (
                <Badge variant="secondary" className="hidden sm:flex items-center gap-1 text-xs px-1.5 py-0.5">
                  <DollarSign className="h-3 w-3 flex-shrink-0" />
                  <span className="font-medium">
                    {user.creditBalance}
                  </span>
                  <span className="hidden lg:inline text-xs">Credits</span>
                </Badge>
              )}

              {/* Mobile navigation menu */}
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 h-9 w-9"
                      aria-label="Open navigation menu"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 p-0">
                    <SheetHeader className="p-4 border-b">
                      <SheetTitle className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                          <GraduationCap className="text-primary-foreground w-3 h-3" />
                        </div>
                        <span>EduFlow Menu</span>
                      </SheetTitle>
                    </SheetHeader>

                    <div className="p-4 space-y-4">
                      {/* User info */}
                      {user && (
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{user.username}</span>
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              <DollarSign className="h-3 w-3" />
                              {user.creditBalance}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Navigation items */}
                      <div className="space-y-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => window.location.href = '/'}
                        >
                          <Home className="mr-2 h-4 w-4" />
                          Home
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => window.location.href = '/tools'}
                        >
                          <BookOpen className="mr-2 h-4 w-4" />
                          AI Tools
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => window.location.href = '/course-manager'}
                        >
                          <PenTool className="mr-2 h-4 w-4" />
                          Course Manager
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => window.location.href = '/template-manager'}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Template Manager
                        </Button>
                      </div>

                      {/* AI Settings */}
                      <div className="space-y-3 border-t pt-4">
                        <h3 className="text-sm font-medium">AI Settings</h3>
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor="mobile-model" className="text-xs text-muted-foreground">Model</Label>
                            <Select value={aiSettings.selectedModel} onValueChange={updateModel}>
                              <SelectTrigger id="mobile-model" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>
                                <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="mobile-language" className="text-xs text-muted-foreground">Language</Label>
                            <Select value={aiSettings.outputLanguage} onValueChange={updateLanguage}>
                              <SelectTrigger id="mobile-language" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="chinese">中文</SelectItem>
                                <SelectItem value="vietnamese">Việt</SelectItem>
                                <SelectItem value="english">English</SelectItem>
                                <SelectItem value="bilingual">中+Việt</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Logout */}
                      <div className="border-t pt-4">
                        <Button
                          variant="outline"
                          className="w-full justify-start text-destructive hover:text-destructive"
                          onClick={() => logoutMutation.mutate()}
                          disabled={logoutMutation.isPending}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          {logoutMutation.isPending ? "Logging out..." : "Logout"}
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              
              {/* Desktop settings */}
              <div className="hidden lg:flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/course-manager'}
                  className="hidden sm:flex px-2 mr-1"
                >
                  <FolderInput className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden md:inline text-xs">Course Manager</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/template-manager'}
                  className="hidden sm:flex px-2"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden md:inline text-xs">Templates</span>
                </Button>
                <select 
                  className="px-1.5 py-0.5 border rounded text-xs bg-background hover:bg-accent transition-colors min-w-0"
                  value={aiSettings.selectedModel}
                  onChange={(e) => updateModel(e.target.value)}
                >
                  <option value="gpt-5-nano">GPT-5-nano</option>
                  <option value="gpt-5-mini">GPT-5-mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="glm-4.6">GLM-4.6</option>
                </select>
                <select 
                  className="px-1.5 py-0.5 border rounded text-xs bg-background hover:bg-accent transition-colors min-w-0"
                  value={aiSettings.outputLanguage}
                  onChange={(e) => updateLanguage(e.target.value)}
                >
                  <option value="auto">Auto</option>
                  <option value="chinese">中文</option>
                  <option value="vietnamese">Tiếng Việt</option>
                  <option value="english">English</option>
                  <option value="bilingual">中文+Tiếng Việt</option>
                </select>
              </div>
              
              {/* Tools button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = '/tools'}
                className="hidden sm:flex px-2"
              >
                <Layers className="h-3.5 w-3.5 mr-1" />
                <span className="hidden md:inline text-xs">AI Tools</span>
                <span className="md:hidden text-xs">Tools</span>
              </Button>
              
              {/* Prompts button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = '/prompts'}
                className="hidden sm:flex px-2"
              >
                <Settings className="h-3.5 w-3.5 mr-1" />
                <span className="hidden md:inline text-xs">Prompts</span>
                <span className="md:hidden text-xs">Prompts</span>
              </Button>
              
              {/* Mobile tools and prompts buttons */}
              <div className="sm:hidden flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.location.href = '/tools'}
                  className="p-1.5"
                >
                  <Layers className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.location.href = '/prompts'}
                  className="p-1.5"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              {/* Logout button */}
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-1 px-2"
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <LogOut className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline text-xs">Logout</span>
                </Button>
              )}
            </nav>
          </div>
          
          {/* Secondary header row for user greeting on mobile */}
          {user && (
            <div className="md:hidden pb-1.5 border-t border-border/50 pt-1.5 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Welcome, {user.username}
                </span>
                <div className="flex items-center space-x-1">
                  <select 
                    className="px-1.5 py-0.5 border rounded text-xs bg-background w-20"
                    value={aiSettings.selectedModel}
                    onChange={(e) => updateModel(e.target.value)}
                  >
                    <option value="gpt-5-nano">5-nano</option>
                    <option value="gpt-5-mini">5-mini</option>
                    <option value="gpt-4o">4o</option>
                  </select>
                  <select 
                    className="px-1.5 py-0.5 border rounded text-xs bg-background w-16"
                    value={aiSettings.outputLanguage}
                    onChange={(e) => updateLanguage(e.target.value)}
                  >
                    <option value="auto">Auto</option>
                    <option value="chinese">中文</option>
                    <option value="vietnamese">Việt</option>
                    <option value="english">EN</option>
                    <option value="bilingual">中+Việt</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>



      {/* Main Content */}
      <main className="flex-1 p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6">
        {/* Lesson Creation Workflow */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              Lesson Creation Workflow
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm text-gray-500" id="progress-label">
                Progress: {Math.round((currentStep / totalSteps) * 100)}%
              </span>
              <div
                className="w-16 md:w-20 bg-gray-200 rounded-full h-1.5 md:h-2"
                role="progressbar"
                aria-valuenow={currentStep}
                aria-valuemin={0}
                aria-valuemax={totalSteps}
                aria-labelledby="progress-label"
              >
                <div
                  className="bg-blue-600 h-1.5 md:h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  aria-hidden="true"
                ></div>
              </div>
            </div>
          </div>
          <KanbanBoard 
          selectedLesson={selectedLesson}
          lesson={lesson || null}
          onLessonSelect={handleSelectLesson}
          currentStep={currentStep}
          onStepUpdate={updateStep}
        />
        </section>

        {/* Recent Lessons & Workflow Integration */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3">
            Recent Lessons & Workflow Integration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {recentLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-800 text-sm md:text-base truncate">
                    {lesson.title}
                  </h3>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {lesson.date}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{lesson.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full"
                      style={{ width: `${lesson.progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSelectLesson(lesson.id)}
                    className="flex-1 bg-blue-600 text-white px-2 py-1.5 rounded text-xs hover:bg-blue-700 transition-colors"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => handleExportLesson(lesson.id)}
                    className="flex-1 bg-gray-600 text-white px-2 py-1.5 rounded text-xs hover:bg-gray-700 transition-colors"
                  >
                    Export
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              onClick={handleQuickTestFlow}
              className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base"
            >
              <div className="text-center">
                <div className="text-lg md:text-xl mb-1">🚀</div>
                <div className="font-medium">Quick Test Flow</div>
                <div className="text-xs opacity-90 mt-1">Start testing immediately</div>
              </div>
            </button>
            <button
              onClick={handleBatchProcess}
              className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition-colors text-sm md:text-base"
            >
              <div className="text-center">
                <div className="text-lg md:text-xl mb-1">⚡</div>
                <div className="font-medium">Batch Process</div>
                <div className="text-xs opacity-90 mt-1">Process multiple lessons</div>
              </div>
            </button>
            <button
              onClick={handleSettings}
              className="bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700 transition-colors text-sm md:text-base"
            >
              <div className="text-center">
                <div className="text-lg md:text-xl mb-1">⚙️</div>
                <div className="font-medium">Settings</div>
                <div className="text-xs opacity-90 mt-1">Configure preferences</div>
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Signature */}
      <footer className="mt-4 md:mt-6 text-center p-3">
        <p className="text-xs md:text-sm text-muted-foreground italic">
          Thanh Hoàng tặng vợ iu Thu Thảo
        </p>
      </footer>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* AI Model Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">AI Model</Label>
              <Select value={aiSettings.selectedModel} onValueChange={updateModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5-nano">GPT-5 Nano (Fast)</SelectItem>
                  <SelectItem value="gpt-5-mini">GPT-5 Mini (Balanced)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (Advanced)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the AI model for lesson generation and analysis
              </p>
            </div>

            {/* Output Language Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Output Language</Label>
              <Select value={aiSettings.outputLanguage} onValueChange={updateLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select output language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto Detect</SelectItem>
                  <SelectItem value="chinese">中文 (Chinese)</SelectItem>
                  <SelectItem value="vietnamese">Tiếng Việt (Vietnamese)</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="bilingual">中文 + Tiếng Việt (Bilingual)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set the preferred language for generated content
              </p>
            </div>

            {/* User Information */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Account Information</Label>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">User:</span>
                  <span className="font-medium">{user?.username || 'Not logged in'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credits:</span>
                  <span className="font-medium text-green-600">$1000</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsSettingsOpen(false)}>
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Home() {
  return (
    <WorkflowProvider>
      <HomeContent />
    </WorkflowProvider>
  );
}
