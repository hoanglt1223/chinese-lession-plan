import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { FileText, Download, Loader2, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportBarProps {
  lessonId: string | null;
  workflow: any;
  disabled?: boolean;
}

export function ExportBar({ lessonId, workflow, disabled = false }: ExportBarProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const exportPdfMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcards: workflow?.stepData?.flashcards || [] }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      
      // Download file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flashcards.pdf';
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
      const content = workflow?.stepData?.lessonPlan || workflow?.stepData?.summary || "";
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
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
    },
    onSuccess: () => {
      toast({
        title: "Export successful",
        description: "DOCX has been downloaded",
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
      const content = workflow?.stepData?.lessonPlan || "";
      const blob = new Blob([content], { type: 'text/markdown' });
      
      // Download file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lesson.md';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export successful",
        description: "Markdown has been downloaded",
      });
    }
  });

  const exportAllMutation = useMutation({
    mutationFn: async () => {
      // Trigger all exports sequentially
      await exportPdfMutation.mutateAsync();
      await exportDocxMutation.mutateAsync();
      await exportMarkdownMutation.mutateAsync();
    },
    onSuccess: () => {
      toast({
        title: "Export successful",
        description: "All files have been downloaded",
      });
    }
  });

  // Mobile responsive export bar
  if (isMobile) {
    return (
      <div className="flex items-center space-x-2">
        {/* Quick Export All Button */}
        <Button
          size="sm"
          onClick={() => exportAllMutation.mutate()}
          disabled={disabled || exportAllMutation.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {exportAllMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden xs:inline ml-1">All</span>
        </Button>

        {/* Individual Export Options in Dropdown */}
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => {
                exportPdfMutation.mutate();
                setIsDropdownOpen(false);
              }}
              disabled={exportPdfMutation.isPending}
            >
              {exportPdfMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportDocxMutation.mutate();
                setIsDropdownOpen(false);
              }}
              disabled={exportDocxMutation.isPending}
            >
              {exportDocxMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export DOCX
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportMarkdownMutation.mutate();
                setIsDropdownOpen(false);
              }}
              disabled={exportMarkdownMutation.isPending}
            >
              {exportMarkdownMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Desktop version - more spacious layout
  return (
    <div className="flex items-center space-x-3 bg-background border border-border rounded-lg px-4 py-2 shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => exportPdfMutation.mutate()}
        disabled={disabled || exportPdfMutation.isPending}
        className="text-sm text-muted-foreground hover:text-primary"
      >
        {exportPdfMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-1" />
        )}
        <span className="hidden sm:inline">PDF</span>
      </Button>
      
      <div className="w-px h-4 bg-border hidden sm:block"></div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => exportDocxMutation.mutate()}
        disabled={disabled || exportDocxMutation.isPending}
        className="text-sm text-muted-foreground hover:text-primary"
      >
        {exportDocxMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-1" />
        )}
        <span className="hidden sm:inline">DOCX</span>
      </Button>
      
      <div className="w-px h-4 bg-border hidden sm:block"></div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => exportMarkdownMutation.mutate()}
        disabled={disabled || exportMarkdownMutation.isPending}
        className="text-sm text-muted-foreground hover:text-primary"
      >
        {exportMarkdownMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-1" />
        )}
        <span className="hidden sm:inline">MD</span>
      </Button>
      
      <Button
        size="sm"
        onClick={() => exportAllMutation.mutate()}
        disabled={disabled || exportAllMutation.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {exportAllMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-1" />
        )}
        <span className="hidden sm:inline">Export All</span>
      </Button>
    </div>
  );
}
