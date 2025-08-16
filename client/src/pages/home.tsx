import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportBar } from "@/components/export/export-bar";
import { KanbanBoard } from "@/components/workflow/kanban-board";
import { useWorkflow } from "@/hooks/use-workflow";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useAI } from "@/contexts/AIContext";
import { GraduationCap, Clock, FolderInput, Layers, Settings, Zap, Loader2, LogOut, DollarSign } from "lucide-react";

export default function Home() {
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const { workflow, currentStep, updateStep } = useWorkflow(selectedLesson);
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
    queryKey: ["/api/lessons"],
    enabled: true,
  });

  const recentLessons = Array.isArray(lessons) ? lessons.slice(0, 4) : [];

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
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadResult = await uploadResponse.json();
      
      // Create a lesson with required fields
      const lessonResponse = await apiRequest('POST', '/api/lessons', {
        title: `Quick Test: ${uploadResult.files[0].name}`,
        level: 'N5',
        ageGroup: 'primary',
        status: 'draft'
      });
      const lessonData = await lessonResponse.json();
      
      // Start analysis immediately
      const analysisResponse = await apiRequest('POST', '/api/analyze', {
        content: uploadResult.files[0].content
      });
      const analysisData = await analysisResponse.json();
      
      // Update workflow with analysis
      const workflowResponse = await apiRequest('GET', `/api/workflows/lesson/${lessonData.lesson.id}`);
      const workflowData = await workflowResponse.json();
      
      await apiRequest('PATCH', `/api/workflows/${workflowData.id}`, {
        currentStep: 1,
        stepData: { analysis: analysisData },
        completedSteps: [0]
      });
      
      return { lessonId: lessonData.lesson.id, analysis: analysisData };
    },
    onSuccess: (data) => {
      setSelectedLesson(data.lessonId);
      queryClient.invalidateQueries({ queryKey: ['/api/lessons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="export-bar border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-primary rounded-lg flex items-center justify-center">
                  <GraduationCap className="text-primary-foreground text-xs lg:text-sm" />
                </div>
                <h1 className="text-lg lg:text-xl font-bold text-foreground">EduFlow</h1>
              </div>
              <span className="text-xs lg:text-sm text-muted-foreground hidden md:block truncate">
                Chinese Lesson Planning Assistant
              </span>
            </div>
            
            <nav className="flex items-center justify-end space-x-2 lg:space-x-4">
              {user && (
                <div className="flex items-center space-x-2 lg:space-x-4">
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs lg:text-sm">
                    <DollarSign className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className="hidden sm:inline">${user.creditBalance}</span>
                    <span className="sm:hidden">${user.creditBalance.split('.')[0]}</span>
                    <span className="hidden lg:inline">Credits</span>
                  </Badge>
                  <span className="text-xs lg:text-sm text-muted-foreground hidden md:block">
                    Welcome, {user.username}
                  </span>
                </div>
              )}
              <div className="hidden lg:flex items-center space-x-2 text-sm">
                <select 
                  className="p-1 border rounded text-xs bg-background"
                  value={aiSettings.selectedModel}
                  onChange={(e) => updateModel(e.target.value)}
                >
                  <option value="gpt-5-nano">GPT-5-nano</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o-mini</option>
                </select>
                <select 
                  className="p-1 border rounded text-xs bg-background"
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
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = '/tools'}
                className="hidden sm:flex"
              >
                AI Tools
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = '/tools'}
                className="sm:hidden px-2"
              >
                Tools
              </Button>
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3"
                >
                  <LogOut className="h-3 w-3 lg:h-4 lg:w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </nav>
            
            <div className="hidden lg:block">
              <ExportBar 
                lessonId={selectedLesson}
                workflow={workflow}
                disabled={!selectedLesson || currentStep === 0}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile AI Settings and Export Bar */}
      <div className="lg:hidden border-b bg-background">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2 text-sm">
              <select className="p-1 border rounded text-xs bg-background">
                <option value="gpt-5-nano">GPT-5-nano</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o-mini</option>
              </select>
              <select className="p-1 border rounded text-xs bg-background">
                <option value="auto">Auto</option>
                <option value="chinese">中文</option>
                <option value="vietnamese">Tiếng Việt</option>
                <option value="english">English</option>
              </select>
            </div>
            <div className="flex-1 flex justify-end">
              <ExportBar 
                lessonId={selectedLesson}
                workflow={workflow}
                disabled={!selectedLesson || currentStep === 0}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 lg:py-8">
        {/* Workflow Progress */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">Lesson Creation Workflow</h2>
            <div className="flex items-center space-x-2 text-xs lg:text-sm text-muted-foreground">
              <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
              <span>Est. 15-20 minutes</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {["Input", "Review", "Plan", "Flashcards", "Summary"].map((step, index) => (
              <div key={step} className="flex items-center space-x-1 lg:space-x-2">
                <div className={`step-indicator ${
                  index === currentStep ? 'active' : 
                  index < currentStep ? 'completed' : 'pending'
                }`}>
                  {index + 1}
                </div>
                <span className={`text-xs lg:text-sm ${
                  index <= currentStep ? 'font-medium text-foreground' : 'text-muted-foreground'
                }`}>
                  {step}
                </span>
                {index < 4 && <div className="hidden lg:block flex-1 h-px bg-border min-w-[20px]"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Kanban Board */}
        <KanbanBoard 
          selectedLesson={selectedLesson}
          onLessonSelect={setSelectedLesson}
          currentStep={currentStep}
          onStepUpdate={updateStep}
        />

        {/* Recent Lessons Integration */}
        {recentLessons.length > 0 && (
          <Card className="mt-6 lg:mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Lessons & Workflow Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {recentLessons.map((lesson: any) => (
                  <div 
                    key={lesson.id} 
                    className={`p-4 border rounded-lg transition-all duration-200 cursor-pointer ${
                      selectedLesson === lesson.id 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'hover:bg-muted/50 hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedLesson(lesson.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground mb-1 truncate">{lesson.title}</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {lesson.level}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {lesson.ageGroup}
                          </Badge>
                        </div>
                      </div>
                      {selectedLesson === lesson.id && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-muted-foreground">
                          {lesson.status === 'completed' ? '100%' : 
                           lesson.status === 'in-progress' ? '60%' : '20%'}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            lesson.status === 'completed' ? 'bg-green-500' : 
                            lesson.status === 'in-progress' ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ 
                            width: lesson.status === 'completed' ? '100%' : 
                                   lesson.status === 'in-progress' ? '60%' : '20%'
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        {lesson.createdAt && new Date(lesson.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLesson(lesson.id);
                          }}
                        >
                          {selectedLesson === lesson.id ? 'Working' : 'Select'}
                        </Button>
                        {lesson.status === 'completed' && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Export lesson functionality
                            }}
                          >
                            Export
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {recentLessons.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {recentLessons.length} recent lesson{recentLessons.length === 1 ? '' : 's'}
                    </span>
                    <Button variant="ghost" size="sm" className="text-xs">
                      View All Lessons →
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="mt-6 lg:mt-8">
          <CardContent className="p-4 lg:p-6">
            <h3 className="text-base lg:text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              <Button 
                variant="outline" 
                className="activity-button h-auto p-4 justify-start"
                onClick={() => quickStartMutation.mutate()}
                disabled={quickStartMutation.isPending}
              >
                <div className="activity-icon bg-accent/10">
                  {quickStartMutation.isPending ? (
                    <Loader2 className="text-accent w-5 h-5 animate-spin" />
                  ) : (
                    <Zap className="text-accent w-5 h-5" />
                  )}
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground">
                    {quickStartMutation.isPending ? 'Loading...' : 'Quick Test Flow'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {quickStartMutation.isPending ? 'Auto-loading input.pdf...' : 'Auto-load input.pdf & test complete workflow'}
                  </p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="activity-button h-auto p-4 justify-start"
                onClick={() => {/* TODO: Batch processing */}}
              >
                <div className="activity-icon bg-secondary/10">
                  <Layers className="text-secondary w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground">Batch Process</h4>
                  <p className="text-xs text-muted-foreground">Process multiple lessons at once</p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="activity-button h-auto p-4 justify-start"
                onClick={() => {/* TODO: Settings */}}
              >
                <div className="activity-icon bg-accent/10">
                  <Settings className="text-accent w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground">Settings</h4>
                  <p className="text-xs text-muted-foreground">Configure AI and templates</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>


      </main>

      {/* Signature */}
      <footer className="mt-8 text-center">
        <p className="text-sm text-muted-foreground italic">
          Thanh Hoàng tặng vợ iu Thu Thảo
        </p>
      </footer>

      {/* Floating Help */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button size="lg" className="w-12 h-12 rounded-full bg-accent hover:bg-accent/90">
          ?
        </Button>
      </div>
    </div>
  );
}
