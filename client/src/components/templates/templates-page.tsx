import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateUpload } from "./template-upload";
import { TemplateList } from "./template-list";
import { FolderPlus, Settings, Info } from "lucide-react";
// Define types locally to avoid import issues
interface Project {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateUploadResponse {
  success: boolean;
  templates?: Array<{
    id: string;
    filename: string;
    originalName: string;
    fileType: string;
    status: 'uploaded' | 'error';
    error?: string;
  }>;
  duplicates?: Array<{
    filename: string;
    originalName: string;
    existingId: string;
  }>;
  errors?: string[];
}

interface TemplatesPageProps {
  projectId?: string;
  className?: string;
}

export function TemplatesPage({ projectId: propProjectId, className }: TemplatesPageProps) {
  const [projectId, setProjectId] = useState<string | null>(propProjectId || null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (propProjectId) {
      setProjectId(propProjectId);
      loadProject(propProjectId);
    }
  }, [propProjectId]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');

      const data = await response.json();
      setProjects(data.projects || []);

      // Auto-select first project if no project is selected
      if (!propProjectId && data.projects?.length > 0) {
        const firstProject = data.projects[0];
        setSelectedProject(firstProject);
        setProjectId(firstProject.id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const loadProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to load project');

      const data = await response.json();
      setSelectedProject(data.project);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      setLoading(true);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create project');

      const data = await response.json();
      const newProject = data.project;

      setProjects(prev => [newProject, ...prev]);
      setSelectedProject(newProject);
      setProjectId(newProject.id);

      // Reset form
      setNewProjectName('');
      setNewProjectDescription('');
      setShowNewProjectDialog(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (response: TemplateUploadResponse) => {
    // Could show a success notification here
    console.log('Upload completed:', response);
  };

  const switchProject = (project: Project) => {
    setSelectedProject(project);
    setProjectId(project.id);
  };

  if (!projectId) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="py-12">
            <div className="text-center max-w-md mx-auto">
              <FolderPlus className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Project Selected</h3>
              <p className="text-muted-foreground mb-6">
                Create a project to organize your templates or select an existing project to get started.
              </p>
              <div className="space-y-3">
                <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Create New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Project</DialogTitle>
                      <DialogDescription>
                        Projects help you organize your templates and collaborate with team members.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="project-name">Project Name</Label>
                        <Input
                          id="project-name"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="e.g., Chinese Language Templates"
                        />
                      </div>
                      <div>
                        <Label htmlFor="project-description">Description (Optional)</Label>
                        <Textarea
                          id="project-description"
                          value={newProjectDescription}
                          onChange={(e) => setNewProjectDescription(e.target.value)}
                          placeholder="Brief description of your project..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowNewProjectDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createProject}
                        disabled={!newProjectName.trim() || loading}
                      >
                        {loading ? 'Creating...' : 'Create Project'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {projects.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Or select an existing project:</p>
                    <div className="space-y-2">
                      {projects.slice(0, 3).map((project) => (
                        <Button
                          key={project.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => switchProject(project)}
                        >
                          <FolderPlus className="w-4 h-4 mr-2" />
                          {project.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {selectedProject && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5" />
                  {selectedProject.name}
                </CardTitle>
                {selectedProject.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedProject.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {projects.length > 1 && (
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Switch Project
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Templates</TabsTrigger>
          <TabsTrigger value="list">Browse Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <TemplateUpload
            projectId={projectId!}
            onUploadComplete={handleUploadComplete}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <TemplateList projectId={projectId!} />
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Template Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Supported Formats</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Markdown files (.md)</li>
                <li>• Word documents (.docx)</li>
                <li>• Maximum file size: 10MB</li>
                <li>• Maximum 10 files per upload</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Best Practices</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Use clear, descriptive filenames</li>
                <li>• Organize content with headings</li>
                <li>• Include metadata in markdown front matter</li>
                <li>• Keep documents focused on specific topics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}