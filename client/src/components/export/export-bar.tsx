import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { FileText, Download, Loader2, MoreHorizontal, Image, FileType, File, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Lesson } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportBarProps {
  lessonId: string | null;
  lesson: Lesson | null;
  disabled?: boolean;
  step?: number;
  stepData?: any;
}

export function ExportBar({ lessonId, lesson, disabled = false, step, stepData }: ExportBarProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Helper function to get appropriate icons for file types
  const getFileTypeIcon = (type: 'pdf' | 'docx' | 'md' | 'images') => {
    switch (type) {
      case 'pdf':
        return FileText;
      case 'docx':
        return FileType;
      case 'md':
        return Hash;
      case 'images':
        return Image;
      default:
        return File;
    }
  };

  // Helper function to get step-specific labels
  const getStepLabels = () => {
    switch (step) {
      case 1:
        return { pdf: 'PDF', docx: 'DOCX', md: 'MD', images: 'N/A' };
      case 2:
        return { pdf: 'N/A', docx: 'DOCX', md: 'MD', images: 'N/A' };
      case 3:
        return { pdf: 'Flashcards PDF', docx: 'N/A', md: 'N/A', images: 'Generated Images' };
      case 4:
        return { pdf: 'N/A', docx: 'DOCX', md: 'MD', images: 'N/A' };
      default:
        return { pdf: 'PDF', docx: 'DOCX', md: 'MD', images: 'N/A' };
    }
  };

  const stepLabels = getStepLabels();

  const exportPdfMutation = useMutation({
    mutationFn: async () => {
      let exportData = {};
      let filename = 'export.pdf';
      let documentType = 'pdf';
      
      if (step === 1) {
        // Step 1: Export analysis results
        exportData = { 
          analysisData: stepData || lesson?.aiAnalysis,
          step: 1
        };
        filename = 'analysis_results.pdf';
      } else if (step === 3) {
        // Step 3: Export flashcards and photos
        exportData = { 
          flashcards: stepData || lesson?.flashcards || [],
          step: 3
        };
        documentType = 'flashcard-pdf';
        filename = 'flashcards.pdf';
      } else {
        // Default: Export flashcards
        exportData = { flashcards: lesson?.flashcards || [] };
        documentType = 'flashcard-pdf';
        filename = 'flashcards.pdf';
      }
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentType,
          ...exportData 
        }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      
      // Download file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export successful",
        description: "PDF has been downloaded",
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Could not export PDF",
        variant: "destructive",
      });
    }
  });

  const exportDocxMutation = useMutation({
    mutationFn: async () => {
      if (step === 2) {
        // Step 2: Export 4 separate lesson plan files
        const lessonPlans = stepData || lesson?.lessonPlans || [];
        
        if (!lessonPlans || lessonPlans.length === 0) {
          throw new Error('No lesson plans available to export');
        }
        
        // Create all download requests in parallel
        const downloadPromises = lessonPlans.map(async (lessonPlan: any) => {
          try {
            const response = await fetch('/api/export', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                documentType: 'docx',
                content: lessonPlan.content || 'No content available',
                step: 2,
                singleLesson: true
              }),
            });
            
            if (!response.ok) {
              console.error(`Failed to export lesson ${lessonPlan.lessonNumber}:`, response.statusText);
              return null;
            }
            
            const blob = await response.blob();
            return {
              blob,
              filename: `${lessonPlan.filename || `lesson_${lessonPlan.lessonNumber || 'unknown'}`}.docx`
            };
          } catch (error) {
            console.error(`Error exporting lesson ${lessonPlan.lessonNumber}:`, error);
            return null;
          }
        });
        
        // Wait for all downloads to complete
        const results = await Promise.all(downloadPromises);
        
        // Trigger all downloads simultaneously
        results.forEach((result) => {
          if (result) {
            const url = window.URL.createObjectURL(result.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }
        });
      } else if (step === 4) {
        // Step 4: Export 4 separate lesson summary files
        const summaries = stepData || lesson?.summaries || [];
        
        if (!summaries || summaries.length === 0) {
          throw new Error('No summaries available to export');
        }
        
        // Create all download requests in parallel
        const downloadPromises = summaries.map(async (summary: any) => {
          try {
            const response = await fetch('/api/export', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                documentType: 'docx',
                content: summary.content || 'No content available',
                step: 4,
                singleSummary: true
              }),
            });
            
            if (!response.ok) {
              console.error(`Failed to export summary ${summary.lessonNumber}:`, response.statusText);
              return null;
            }
            
            const blob = await response.blob();
            return {
              blob,
              filename: `${summary.filename || `summary_${summary.lessonNumber || 'unknown'}`}.docx`
            };
          } catch (error) {
            console.error(`Error exporting summary ${summary.lessonNumber}:`, error);
            return null;
          }
        });
        
        // Wait for all downloads to complete
        const results = await Promise.all(downloadPromises);
        
        // Trigger all downloads simultaneously
        results.forEach((result) => {
          if (result) {
            const url = window.URL.createObjectURL(result.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }
        });
      } else {
        // Default: Export single file
        const content = lesson?.lessonPlans || lesson?.summaries || "";
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            documentType: 'docx',
            content 
          }),
        });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        
        // Download file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lesson.docx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    },
    onSuccess: () => {
      const message = (step === 2 || step === 4) ? "DOCX files have been downloaded" : "DOCX has been downloaded";
      toast({
        title: "Export successful",
        description: message,
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Could not export DOCX",
        variant: "destructive",
      });
    }
  });

  const exportMarkdownMutation = useMutation({
    mutationFn: async () => {
      if (step === 1) {
        // Step 1: Export analysis as single markdown file
        const analysisData = stepData || lesson?.aiAnalysis;
        let content = '';
        if (analysisData) {
          content = `# Analysis Results\n\n`;
          content += `**Detected Level:** ${analysisData.detectedLevel || 'N/A'}\n`;
          content += `**Age Appropriate:** ${analysisData.ageAppropriate || 'N/A'}\n`;
          content += `**Main Theme:** ${analysisData.mainTheme || 'N/A'}\n\n`;
          
          if (analysisData.vocabulary && analysisData.vocabulary.length > 0) {
            content += `## Vocabulary\n`;
            analysisData.vocabulary.forEach((word: string) => {
              content += `- ${word}\n`;
            });
            content += '\n';
          }
          
          if (analysisData.activities && analysisData.activities.length > 0) {
            content += `## Learning Activities\n`;
            analysisData.activities.forEach((activity: string) => {
              content += `- ${activity}\n`;
            });
          }
        }
        
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analysis_results.md';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (step === 2) {
        // Step 2: Export 4 separate lesson plan markdown files
        const lessonPlans = stepData || lesson?.lessonPlans || [];
        
        if (!lessonPlans || lessonPlans.length === 0) {
          throw new Error('No lesson plans available to export');
        }
        
        // Create all files and trigger downloads simultaneously
        lessonPlans.forEach((lessonPlan: any) => {
          const content = `# Lesson ${lessonPlan.lessonNumber || 'Unknown'}: ${lessonPlan.title || 'Untitled'}\n\n**Type:** ${lessonPlan.type || 'N/A'}\n\n${lessonPlan.content || 'No content available'}`;
          
          const blob = new Blob([content], { type: 'text/markdown' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${lessonPlan.filename || `lesson_${lessonPlan.lessonNumber || 'unknown'}`}.md`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        });
      } else if (step === 4) {
        // Step 4: Export 4 separate summary markdown files
        const summaries = stepData || lesson?.summaries || [];
        
        if (!summaries || summaries.length === 0) {
          throw new Error('No summaries available to export');
        }
        
        // Create all files and trigger downloads simultaneously
        summaries.forEach((summary: any) => {
          const content = `# Lesson ${summary.lessonNumber || 'Unknown'}: ${summary.title || 'Untitled'}\n\n${summary.content || 'No content available'}`;
          
          const blob = new Blob([content], { type: 'text/markdown' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${summary.filename || `summary_${summary.lessonNumber || 'unknown'}`}.md`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        });
      } else {
        // Default: Export single file
        const content = lesson?.lessonPlans || "";
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lesson.md';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    },
    onSuccess: () => {
      const message = (step === 2 || step === 4) ? "Markdown files have been downloaded" : "Markdown has been downloaded";
      toast({
        title: "Export successful",
        description: message,
      });
    }
  });

  const exportImagesMutation = useMutation({
    mutationFn: async () => {
      if (step === 3) {
        // Step 3: Export generated images from flashcards
        const flashcards = stepData || lesson?.flashcards || [];
        
        if (!flashcards || flashcards.length === 0) {
          throw new Error('No flashcards with images available to export');
        }
        
        // Filter flashcards that have valid image URLs (not placeholder)
        const flashcardsWithImages = flashcards.filter((card: any) => 
          card.imageUrl && 
          !card.imageUrl.includes('placeholder') &&
          card.imageUrl.trim() !== ''
        );
        
        if (flashcardsWithImages.length === 0) {
          throw new Error('No generated images found in flashcards');
        }
        
        // Download each image
        const downloadPromises = flashcardsWithImages.map(async (card: any, index: number) => {
          try {
            const response = await fetch(card.imageUrl);
            if (!response.ok) throw new Error(`Failed to fetch image for ${card.word}`);
            
            const blob = await response.blob();
            const fileExtension = card.imageUrl.includes('.jpg') ? 'jpg' : 'png';
            const filename = `${card.word.replace(/[^a-zA-Z0-9]/g, '_')}_${index + 1}.${fileExtension}`;
            
            return { blob, filename };
          } catch (error) {
            console.error(`Error downloading image for ${card.word}:`, error);
            return null;
          }
        });
        
        // Wait for all downloads to complete
        const results = await Promise.all(downloadPromises);
        
        // Trigger all downloads simultaneously
        results.forEach((result) => {
          if (result) {
            const url = window.URL.createObjectURL(result.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }
        });
      } else {
        throw new Error('Images export is only available for flashcards step');
      }
    },
    onSuccess: () => {
      toast({
        title: "Export successful",
        description: "Generated images have been downloaded",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export failed",
        description: error.message || "Could not export images",
        variant: "destructive",
      });
    }
  });

  const exportAllMutation = useMutation({
    mutationFn: async () => {
      // Only trigger exports for available formats in this step
      const promises = [];
      
      if (stepLabels.pdf !== 'N/A') {
        promises.push(exportPdfMutation.mutateAsync());
      }
      
      if (stepLabels.docx !== 'N/A') {
        promises.push(exportDocxMutation.mutateAsync());
      }
      
      if (stepLabels.md !== 'N/A') {
        promises.push(exportMarkdownMutation.mutateAsync());
      }
      
      if (stepLabels.images !== 'N/A') {
        promises.push(exportImagesMutation.mutateAsync());
      }
      
      // Run all available exports in parallel
      await Promise.all(promises);
    },
    onSuccess: () => {
      const availableFormats = [];
      if (stepLabels.pdf !== 'N/A') availableFormats.push('PDF');
      if (stepLabels.docx !== 'N/A') availableFormats.push('DOCX');
      if (stepLabels.md !== 'N/A') availableFormats.push('MD');
      if (stepLabels.images !== 'N/A') availableFormats.push('Images');
      
      toast({
        title: "Export successful",
        description: `${availableFormats.join(', ')} files have been downloaded`,
      });
    }
  });

  // Check if there are any available export formats
  const hasAnyExports = stepLabels.pdf !== 'N/A' || stepLabels.docx !== 'N/A' || stepLabels.md !== 'N/A' || stepLabels.images !== 'N/A';

  // Don't render anything if no exports are available
  if (!hasAnyExports) {
    return null;
  }

  // Mobile responsive export bar
  if (isMobile) {
    return (
      <div className="flex items-center justify-between gap-2 bg-muted/30 rounded-lg p-2">
        {/* Quick Export All Button */}
        <Button
          size="sm"
          onClick={() => exportAllMutation.mutate()}
          disabled={disabled || exportAllMutation.isPending}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 min-w-0"
        >
          {exportAllMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="ml-1 text-xs truncate">
            Export
          </span>
        </Button>

        {/* Individual Export Options in Dropdown */}
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled} className="px-2">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-w-[90vw]">
            {stepLabels.pdf !== 'N/A' && (
              <DropdownMenuItem
                onClick={() => {
                  exportPdfMutation.mutate();
                  setIsDropdownOpen(false);
                }}
                disabled={exportPdfMutation.isPending}
                className="text-sm"
              >
                {exportPdfMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  React.createElement(getFileTypeIcon('pdf'), { className: "w-4 h-4 mr-2" })
                )}
                <span className="truncate">{stepLabels.pdf}</span>
              </DropdownMenuItem>
            )}
            {stepLabels.docx !== 'N/A' && (
              <DropdownMenuItem
                onClick={() => {
                  exportDocxMutation.mutate();
                  setIsDropdownOpen(false);
                }}
                disabled={exportDocxMutation.isPending}
                className="text-sm"
              >
                {exportDocxMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  React.createElement(getFileTypeIcon('docx'), { className: "w-4 h-4 mr-2" })
                )}
                <span className="truncate">{stepLabels.docx}</span>
              </DropdownMenuItem>
            )}
            {stepLabels.md !== 'N/A' && (
              <DropdownMenuItem
                onClick={() => {
                  exportMarkdownMutation.mutate();
                  setIsDropdownOpen(false);
                }}
                disabled={exportMarkdownMutation.isPending}
                className="text-sm"
              >
                {exportMarkdownMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  React.createElement(getFileTypeIcon('md'), { className: "w-4 h-4 mr-2" })
                )}
                <span className="truncate">{stepLabels.md}</span>
              </DropdownMenuItem>
            )}
            {stepLabels.images !== 'N/A' && (
              <DropdownMenuItem
                onClick={() => {
                  exportImagesMutation.mutate();
                  setIsDropdownOpen(false);
                }}
                disabled={exportImagesMutation.isPending}
                className="text-sm"
              >
                {exportImagesMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  React.createElement(getFileTypeIcon('images'), { className: "w-4 h-4 mr-2" })
                )}
                <span className="truncate">{stepLabels.images}</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Desktop version - more spacious layout
  return (
    <div className="flex items-center gap-1 bg-muted/30 border border-border rounded-lg p-2 shadow-sm">
      {stepLabels.pdf !== 'N/A' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => exportPdfMutation.mutate()}
          disabled={disabled || exportPdfMutation.isPending}
          className="text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 px-2 py-1"
        >
          {exportPdfMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            React.createElement(getFileTypeIcon('pdf'), { className: "w-4 h-4 mr-1" })
          )}
          <span className="hidden md:inline">{stepLabels.pdf}</span>
          <span className="md:hidden">PDF</span>
        </Button>
      )}
      
      {stepLabels.docx !== 'N/A' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => exportDocxMutation.mutate()}
          disabled={disabled || exportDocxMutation.isPending}
          className="text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 px-2 py-1"
        >
          {exportDocxMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            React.createElement(getFileTypeIcon('docx'), { className: "w-4 h-4 mr-1" })
          )}
          <span className="hidden md:inline">{stepLabels.docx}</span>
          <span className="md:hidden">DOCX</span>
        </Button>
      )}
      
      {stepLabels.md !== 'N/A' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => exportMarkdownMutation.mutate()}
          disabled={disabled || exportMarkdownMutation.isPending}
          className="text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 px-2 py-1"
        >
          {exportMarkdownMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            React.createElement(getFileTypeIcon('md'), { className: "w-4 h-4 mr-1" })
          )}
          <span className="hidden md:inline">{stepLabels.md}</span>
          <span className="md:hidden">MD</span>
        </Button>
      )}
      
      {stepLabels.images !== 'N/A' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => exportImagesMutation.mutate()}
          disabled={disabled || exportImagesMutation.isPending}
          className="text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 px-2 py-1"
        >
          {exportImagesMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            React.createElement(getFileTypeIcon('images'), { className: "w-4 h-4 mr-1" })
          )}
          <span className="hidden md:inline">{stepLabels.images}</span>
          <span className="md:hidden">Images</span>
        </Button>
      )}
      
      {/* Separator */}
      {(stepLabels.pdf !== 'N/A' || stepLabels.docx !== 'N/A' || stepLabels.md !== 'N/A' || stepLabels.images !== 'N/A') && (
        <div className="w-px h-4 bg-border mx-1"></div>
      )}
      
      <Button
        size="sm"
        onClick={() => exportAllMutation.mutate()}
        disabled={disabled || exportAllMutation.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 text-xs"
      >
        {exportAllMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-1" />
        )}
        <span className="hidden lg:inline">Export</span>
        <span className="lg:hidden">All</span>
      </Button>
    </div>
  );
}
