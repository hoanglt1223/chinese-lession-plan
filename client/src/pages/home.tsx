
import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Layout, BookOpen, FileText, Image as ImageIcon, List, 
  Play, Save, Loader2, Upload, Search, ChevronRight, 
  CheckCircle, AlertCircle, RefreshCw, Layers
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// --- Types ---
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

// --- Components ---

export default function Home() {
  const [selectedLesson, setSelectedLesson] = useState<{unit: number, lesson: number, title: string} | null>(null);
  const [activeTab, setActiveTab] = useState("plan");
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [skipFlashcards, setSkipFlashcards] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Queries & Mutations ---

  const { data: courseData, isLoading: isCourseLoading, refetch: refetchCourse } = useQuery<CourseStructure>({
    queryKey: ["/api/course-ops?action=structure"],
    queryFn: async () => {
      const res = await fetch("/api/course-ops?action=structure");
      if (!res.ok) throw new Error("Failed to fetch course structure");
      return res.json();
    }
  });

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
         if (params.action === 'read' && res.status === 404) return { content: '' };
         throw new Error("Failed to access file content");
      }
      return res.json();
    }
  });

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
    },
    onSuccess: () => {
      toast({ title: "Generation Complete", description: "Lesson plan and materials generated." });
      // Refresh content if we are looking at it
      if (selectedLesson) {
        loadFileContent(selectedLesson.unit, selectedLesson.lesson);
      }
    },
    onError: (error) => {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      // Add action param to URL for multer handling check
      const res = await fetch("/api/course-ops?action=import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload course outline");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Course Outline Updated", description: "The course structure has been refreshed." });
      refetchCourse();
    },
    onError: (error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLesson) return;
      await fileContentMutation.mutateAsync({
        action: 'write',
        unit: selectedLesson.unit,
        lesson: selectedLesson.lesson,
        content: editorContent
      });
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Lesson plan updated." });
    },
    onError: () => {
      toast({ title: "Save Failed", variant: "destructive" });
    }
  });

  // --- Handlers ---

  const loadFileContent = async (unit: number, lesson: number) => {
    setEditorContent("Loading content...");
    try {
      const data = await fileContentMutation.mutateAsync({ action: 'read', unit, lesson });
      setEditorContent(data.content || "# No generated content yet.\n\nClick 'Generate Lesson' to start.");
    } catch (error) {
      setEditorContent("Error loading content.");
    }
  };

  const handleSelectLesson = (unit: number, lesson: number, title: string) => {
    setSelectedLesson({ unit, lesson, title });
    loadFileContent(unit, lesson);
  };

  const handleGenerate = () => {
    if (!selectedLesson) return;
    generateMutation.mutate({
      unit: selectedLesson.unit,
      lesson: selectedLesson.lesson,
      force: forceRegenerate,
      skipFlashcards: skipFlashcards
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate(e.target.files[0]);
    }
  };

  // --- Render Helpers ---

  const renderSidebar = () => (
    <div className="w-80 border-r bg-muted/10 flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Course Structure</h2>
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Upload Outline">
            <Upload className="h-4 w-4" />
          </Button>
          <input type="file" accept=".xlsx" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search lessons..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {isCourseLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Accordion type="multiple" className="w-full" defaultValue={Object.keys(courseData?.structure || {}).slice(0, 1)}>
            {Object.entries(courseData?.structure || {})
              .filter(([unitName]) => unitName.toLowerCase().includes(searchTerm.toLowerCase()) || true) // Simple unit filter
              .map(([unitName, lessons]) => (
              <AccordionItem value={unitName} key={unitName}>
                <AccordionTrigger className="px-4 hover:no-underline py-3 text-sm">
                  <span className="font-medium">{unitName}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">{lessons.length}</Badge>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-2">
                  {lessons
                    .filter(l => l.title.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((lesson) => (
                    <div 
                      key={`${lesson.unitNumber}-${lesson.lessonNumber}`}
                      className={`
                        flex items-center px-4 py-2 cursor-pointer text-sm transition-colors
                        ${selectedLesson?.unit === lesson.unitNumber && selectedLesson?.lesson === lesson.lessonNumber 
                          ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}
                      `}
                      onClick={() => handleSelectLesson(lesson.unitNumber, lesson.lessonNumber, lesson.title)}
                    >
                      <div className="flex-1 truncate">
                        <span className="mr-2 opacity-70">{lesson.lessonNumber}.</span>
                        {lesson.title}
                      </div>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </ScrollArea>
      
      <div className="p-4 border-t bg-background">
        <Link href="/batch-manager">
          <Button variant="outline" className="w-full justify-between">
            Batch Manager <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );

  const renderMainContent = () => {
    if (!selectedLesson) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-4">
            <div className="p-4 bg-muted rounded-full w-fit mx-auto">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Select a Lesson</h3>
            <p>Choose a lesson from the sidebar to start working.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Toolbar */}
        <div className="border-b p-4 flex items-center justify-between bg-background/95 backdrop-blur z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Unit {selectedLesson.unit}</span>
              <ChevronRight className="h-3 w-3" />
              <span>Lesson {selectedLesson.lesson}</span>
            </div>
            <h1 className="text-2xl font-bold">{selectedLesson.title}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 mr-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="force" checked={forceRegenerate} onCheckedChange={(c) => setForceRegenerate(!!c)} />
                <Label htmlFor="force">Force</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="skip" checked={skipFlashcards} onCheckedChange={(c) => setSkipFlashcards(!!c)} />
                <Label htmlFor="skip">Skip Cards</Label>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={generateMutation.isPending}
              className="min-w-[140px]"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> Generate
                </>
              )}
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-2 border-b bg-muted/5">
            <TabsList>
              <TabsTrigger value="plan" className="gap-2"><FileText className="h-4 w-4" /> Lesson Plan</TabsTrigger>
              <TabsTrigger value="flashcards" className="gap-2"><ImageIcon className="h-4 w-4" /> Flashcards</TabsTrigger>
              <TabsTrigger value="summary" className="gap-2"><List className="h-4 w-4" /> Summary</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden relative bg-background">
            <TabsContent value="plan" className="h-full m-0 border-0">
               <MarkdownEditor
                  value={editorContent}
                  onChange={setEditorContent}
                  className="h-full border-0 rounded-none"
               />
            </TabsContent>
            
            <TabsContent value="flashcards" className="h-full m-0 p-8 overflow-auto">
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                <ImageIcon className="h-12 w-12 opacity-20" />
                <p>Flashcard preview coming soon. Check generated files.</p>
                <Button variant="outline" disabled>View PDF</Button>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="h-full m-0 p-8 overflow-auto">
               <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                <List className="h-12 w-12 opacity-20" />
                <p>Summary preview coming soon. Check generated files.</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* App Header */}
      <header className="h-14 border-b px-6 flex items-center justify-between bg-card">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <Layout className="h-6 w-6" />
          <span>Lesson Planner</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/course-manager">
             <Button variant="ghost" size="sm">Course Manager</Button>
          </Link>
          <Link href="/batch-manager">
             <Button variant="ghost" size="sm">Batch Manager (Old Home)</Button>
          </Link>
          <Link href="/tools">
             <Button variant="ghost" size="sm">Tools</Button>
          </Link>
          <Link href="/prompts">
             <Button variant="ghost" size="sm">Prompts</Button>
          </Link>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {renderSidebar()}
        {renderMainContent()}
      </div>
    </div>
  );
}
