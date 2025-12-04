import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, RefreshCw, CheckCircle, XCircle, Clock, Play, Square, 
  Upload, Eye, Save, AlertCircle 
} from "lucide-react";
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MarkdownEditor } from "@/components/editor/markdown-editor";

interface Lesson {
  unitNumber: number;
  lessonNumber: number;
  title: string;
  type: string;
  vocabulary: string[];
  objectives: string[];
}

interface CourseStructure {
  structure: Record<string, Lesson[]>;
  totalLessons: number;
  filePath: string;
}

interface GenerationStatus {
  [key: string]: {
    status: 'pending' | 'processing' | 'success' | 'error' | 'skipped';
    message?: string;
    duration?: number;
  };
}

export default function CourseManager() {
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({});
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [skipFlashcards, setSkipFlashcards] = useState(true);
  const [progress, setProgress] = useState(0);
  const stopRef = useRef(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentEditingLesson, setCurrentEditingLesson] = useState<{unit: number, lesson: number, title: string} | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Structure
  const { data: courseData, isLoading, error, refetch } = useQuery<CourseStructure>({
    queryKey: ["/api/course-ops?action=structure"],
    queryFn: async () => {
      const res = await fetch("/api/course-ops?action=structure");
      if (!res.ok) throw new Error("Failed to fetch course structure");
      return res.json();
    }
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch("/api/course-ops?action=import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload course outline");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Course Outline Updated", description: "The course structure has been refreshed." });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    }
  });

  // Generate Mutation
  const generateMutation = useMutation({
    mutationFn: async (params: { unit: number; lesson: number; force: boolean; skipFlashcards: boolean }) => {
      const res = await fetch("/api/course-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: 'generate',
          unitNumber: params.unit, 
          lessonNumber: params.lesson,
          force: params.force,
          skipFlashcards: params.skipFlashcards
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Generation failed");
      }
      return res.json();
    }
  });

  // File Content Mutation (Read/Write)
  const fileContentMutation = useMutation({
    mutationFn: async (params: { action: 'read' | 'write', unit: number, lesson: number, content?: string }) => {
      const res = await fetch("/api/content-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          action: params.action === 'read' ? 'read-file' : 'write-file'
        }),
      });
      if (!res.ok) {
         if (params.action === 'read' && res.status === 404) return { content: '' }; // Handle new file
         throw new Error("Failed to access file content");
      }
      return res.json();
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate(e.target.files[0]);
    }
  };

  const handleToggleLesson = (unit: number, lesson: number) => {
    const key = `${unit}-${lesson}`;
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedLessons(newSelected);
  };

  const handleToggleUnit = (unitName: string, lessons: Lesson[]) => {
    const newSelected = new Set(selectedLessons);
    const allSelected = lessons.every(l => newSelected.has(`${l.unitNumber}-${l.lessonNumber}`));
    
    lessons.forEach(l => {
      const key = `${l.unitNumber}-${l.lessonNumber}`;
      if (allSelected) {
        newSelected.delete(key);
      } else {
        newSelected.add(key);
      }
    });
    setSelectedLessons(newSelected);
  };

  const handleStop = () => {
    stopRef.current = true;
    toast({
      title: "Stopping...",
      description: "Batch generation will stop after the current lesson.",
    });
  };

  const handleGenerate = async () => {
    const queue = Array.from(selectedLessons);
    if (queue.length === 0) return;

    stopRef.current = false;
    setProgress(0);
    
    // Reset status for queued items
    const initialStatus: GenerationStatus = {};
    queue.forEach(key => {
      initialStatus[key] = { status: 'pending' };
    });
    setGenerationStatus(prev => ({ ...prev, ...initialStatus }));

    toast({
      title: "Batch Generation Started",
      description: `Processing ${queue.length} lessons...`,
    });

    let completedCount = 0;

    // Process sequentially
    for (const key of queue) {
      if (stopRef.current) {
        setGenerationStatus(prev => ({ ...prev, [key]: { status: 'skipped', message: 'Stopped by user' } }));
        continue;
      }

      const [unit, lesson] = key.split('-').map(Number);
      const startTime = Date.now();
      
      setGenerationStatus(prev => ({ ...prev, [key]: { status: 'processing' } }));
      
      try {
        await generateMutation.mutateAsync({ 
          unit, 
          lesson, 
          force: forceRegenerate,
          skipFlashcards: skipFlashcards
        });
        const duration = Date.now() - startTime;
        setGenerationStatus(prev => ({ 
          ...prev, 
          [key]: { status: 'success', duration } 
        }));
      } catch (error: any) {
        console.error(`Error generating ${key}:`, error);
        setGenerationStatus(prev => ({ 
          ...prev, 
          [key]: { status: 'error', message: error.message } 
        }));
      } finally {
        completedCount++;
        setProgress((completedCount / queue.length) * 100);
      }
    }

    toast({
      title: stopRef.current ? "Batch Generation Stopped" : "Batch Generation Completed",
      description: `Processed ${completedCount}/${queue.length} lessons.`,
      variant: stopRef.current ? "default" : "default",
    });
  };

  const handleEdit = async (unit: number, lesson: number, title: string) => {
    setCurrentEditingLesson({ unit, lesson, title });
    setEditorContent("Loading...");
    setIsEditorOpen(true);
    
    try {
      const data = await fileContentMutation.mutateAsync({ action: 'read', unit, lesson });
      setEditorContent(data.content || "# New Lesson Plan\n\nGenerated content will appear here.");
    } catch (error) {
      setEditorContent("Error loading content. File might not exist yet.");
    }
  };

  const handleSave = async () => {
    if (!currentEditingLesson) return;
    setIsSaving(true);
    try {
      await fileContentMutation.mutateAsync({ 
        action: 'write', 
        unit: currentEditingLesson.unit, 
        lesson: currentEditingLesson.lesson,
        content: editorContent
      });
      toast({ title: "Saved", description: "Lesson plan updated successfully." });
      setIsEditorOpen(false);
    } catch (error) {
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (key: string) => {
    const statusObj = generationStatus[key];
    const status = statusObj?.status;

    switch (status) {
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-gray-400" />;
      case 'skipped': return <Square className="h-4 w-4 text-gray-400" />;
      default: return null;
    }
  };
  
  const isProcessing = generateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Loading Course Structure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
            <CardHeader>
                <CardTitle className="text-red-500 flex items-center gap-2"><XCircle /> Error Loading Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">Failed to load the course outline. Please check if the Excel file exists.</p>
                <Button onClick={() => refetch()} className="w-full">Retry</Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Course Manager</h1>
          <p className="text-muted-foreground">
             Course Workflow: <span className="font-medium text-foreground">{courseData?.filePath ? courseData.filePath.split(/[/\\]/).pop() : "No file loaded"}</span> 
             • {courseData?.totalLessons || 0} Lessons
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".xlsx" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Outline (.xlsx)
          </Button>
          
          <Link href="/">
             <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </div>

      {/* Controls & Actions */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-md">
                    <Checkbox 
                    id="force" 
                    checked={forceRegenerate} 
                    onCheckedChange={(checked) => setForceRegenerate(!!checked)} 
                    disabled={isProcessing}
                    />
                    <label htmlFor="force" className="text-sm font-medium leading-none cursor-pointer">
                    Force Regenerate
                    </label>
                </div>
                
                <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-md">
                    <Checkbox 
                    id="skipFlashcards" 
                    checked={skipFlashcards} 
                    onCheckedChange={(checked) => setSkipFlashcards(!!checked)} 
                    disabled={isProcessing}
                    />
                    <label htmlFor="skipFlashcards" className="text-sm font-medium leading-none cursor-pointer">
                    Skip Flashcards
                    </label>
                </div>
                
                {selectedLessons.size > 0 && (
                    <Badge variant="secondary" className="h-8 px-3">
                        {selectedLessons.size} Selected
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
                {isProcessing ? (
                    <Button variant="destructive" onClick={handleStop} className="w-full md:w-auto">
                    <Square className="mr-2 h-4 w-4 fill-current" /> Stop Generation
                    </Button>
                ) : (
                    <Button 
                    onClick={handleGenerate} 
                    disabled={selectedLessons.size === 0}
                    className="w-full md:w-auto min-w-[200px]"
                    >
                    <Play className="mr-2 h-4 w-4 fill-current" /> 
                    Generate Selected ({selectedLessons.size})
                    </Button>
                )}
            </div>
        </div>
        
        {/* Global Progress Bar */}
        {isProcessing && (
            <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing Batch...</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            </div>
        )}
      </div>

      {/* Main Content: Course Tree */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <Accordion type="multiple" className="w-full" defaultValue={Object.keys(courseData?.structure || {}).slice(0, 1)}>
                {Object.entries(courseData?.structure || {}).map(([unitName, lessons]) => (
                  <AccordionItem value={unitName} key={unitName} className="border-b px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={lessons.every(l => selectedLessons.has(`${l.unitNumber}-${l.lessonNumber}`))}
                          onCheckedChange={() => handleToggleUnit(unitName, lessons)}
                          disabled={isProcessing}
                        />
                        <span className="font-semibold text-lg">{unitName}</span>
                        <Badge variant="outline" className="ml-auto mr-4">{lessons.length} Lessons</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-2 pb-4">
                        {lessons.map((lesson) => {
                          const key = `${lesson.unitNumber}-${lesson.lessonNumber}`;
                          const statusObj = generationStatus[key];
                          return (
                            <div 
                              key={key} 
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                statusObj?.status === 'processing' ? 'bg-blue-50 border-blue-200' : 
                                statusObj?.status === 'success' ? 'bg-green-50 border-green-200' :
                                statusObj?.status === 'error' ? 'bg-red-50 border-red-200' :
                                'hover:bg-accent border-transparent hover:border-border'
                              }`}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <Checkbox 
                                  checked={selectedLessons.has(key)}
                                  onCheckedChange={() => handleToggleLesson(lesson.unitNumber, lesson.lessonNumber)}
                                  disabled={isProcessing}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-base">Lesson {lesson.lessonNumber}: {lesson.title}</span>
                                    {getStatusIcon(key)}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex gap-2 mt-1 truncate">
                                    <Badge variant="secondary" className="text-xs">{lesson.type}</Badge>
                                    <span className="truncate max-w-[300px]">{lesson.objectives[0]}</span>
                                  </div>
                                  {statusObj?.message && (
                                    <p className="text-xs text-red-500 mt-1">{statusObj.message}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleEdit(lesson.unitNumber, lesson.lessonNumber, lesson.title)}
                                >
                                  <Eye className="h-4 w-4 mr-2" /> View / Edit
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Live Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Lesson Plan</DialogTitle>
            <DialogDescription>
                {currentEditingLesson?.title} (Unit {currentEditingLesson?.unit}, Lesson {currentEditingLesson?.lesson})
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
             <MarkdownEditor
                value={editorContent}
                onChange={setEditorContent}
                className="h-full"
             />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
