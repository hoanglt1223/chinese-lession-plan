import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Lesson } from "@shared/schema";

interface GlobalExportBarProps {
  lesson: Lesson | null;
  disabled?: boolean;
}

export function GlobalExportBar({ lesson, disabled = false }: GlobalExportBarProps) {
  const { toast } = useToast();

  const exportAllMutation = useMutation({
    mutationFn: async () => {
      if (!lesson) {
        throw new Error('No lesson data available for export');
      }

      const exports = [];

      // Step 1: Analysis results export (if available)
      if (lesson.aiAnalysis) {
        exports.push(exportAnalysisData(lesson.aiAnalysis));
      }

      // Step 2: Lesson plans export (if available)
      if (lesson.lessonPlans && Array.isArray(lesson.lessonPlans) && lesson.lessonPlans.length > 0) {
        exports.push(exportLessonPlans(lesson.lessonPlans));
      }

      // Step 3: Flashcards and images export (if available)
      if (lesson.flashcards && Array.isArray(lesson.flashcards) && lesson.flashcards.length > 0) {
        exports.push(exportFlashcardsData(lesson.flashcards));
        exports.push(exportFlashcardImages(lesson.flashcards));
      }

      // Step 4: Summaries export (if available)
      if (lesson.summaries && Array.isArray(lesson.summaries) && lesson.summaries.length > 0) {
        exports.push(exportSummaries(lesson.summaries));
      }

      if (exports.length === 0) {
        throw new Error('No exportable data found in lesson');
      }

      // Execute all exports in parallel
      await Promise.all(exports);
    },
    onSuccess: () => {
      toast({
        title: "Global Export successful",
        description: "All available lesson data has been downloaded",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Global Export failed",
        description: error.message || "Could not export all lesson data",
        variant: "destructive",
      });
    }
  });

  // Helper function to export analysis data
  const exportAnalysisData = async (analysisData: any) => {
    // Export as DOCX
    const docxResponse = await fetch('/api/export', {
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
    const pdfResponse = await fetch('/api/export', {
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
      const docxResponse = await fetch('/api/export', {
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
    const pdfResponse = await fetch('/api/export', {
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

  // Helper function to export flashcard images
  const exportFlashcardImages = async (flashcards: any[]) => {
    const flashcardsWithImages = flashcards.filter((card: any) => 
      card.imageUrl && 
      !card.imageUrl.includes('placeholder') &&
      card.imageUrl.trim() !== ''
    );

    if (flashcardsWithImages.length === 0) return;

    const downloadPromises = flashcardsWithImages.map(async (card: any, index: number) => {
      try {
        const response = await fetch(card.imageUrl);
        if (!response.ok) return null;
        
        const blob = await response.blob();
        const fileExtension = card.imageUrl.includes('.jpg') ? 'jpg' : 'png';
        const filename = `${card.word.replace(/[^a-zA-Z0-9]/g, '_')}_${index + 1}.${fileExtension}`;
        
        downloadFile(blob, filename);
        return true;
      } catch (error) {
        console.error(`Error downloading image for ${card.word}:`, error);
        return null;
      }
    });

    await Promise.all(downloadPromises);
  };

  // Helper function to export summaries
  const exportSummaries = async (summaries: any[]) => {
    const exportPromises = summaries.map(async (summary) => {
      // DOCX export
      const docxResponse = await fetch('/api/export', {
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

  // Don't render if no lesson data
  if (!lesson) {
    return null;
  }

  // Check if there's any exportable data
  const hasExportableData = lesson.aiAnalysis || 
    (lesson.lessonPlans && Array.isArray(lesson.lessonPlans) && lesson.lessonPlans.length > 0) ||
    (lesson.flashcards && Array.isArray(lesson.flashcards) && lesson.flashcards.length > 0) ||
    (lesson.summaries && Array.isArray(lesson.summaries) && lesson.summaries.length > 0);

  if (!hasExportableData) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative group">
        <Button
          size="lg"
          onClick={() => exportAllMutation.mutate()}
          disabled={disabled || exportAllMutation.isPending}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 px-4 py-2 sm:px-6 sm:py-3"
        >
          {exportAllMutation.isPending ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          )}
          <span className="font-medium text-sm sm:text-base">
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </span>
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap max-w-xs">
            <span className="hidden sm:inline">Downloads all available lesson data (Analysis, Lessons, Flashcards, Images, Summaries)</span>
            <span className="sm:hidden">Downloads all lesson data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
