import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Upload,
  Plus,
  Edit,
  Eye,
  Trash2,
  Search,
  Filter,
  Download,
  Zap,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import template components
import { TemplateUploadZone } from '@/components/template/template-upload-zone';
import { TemplatePreview } from '@/components/template/template-preview';
import { TemplateValidator, ValidationResult } from '@/components/template/template-validator';
import { VariableHighlighter, TemplateVariable } from '@/components/template/variable-highlighter';
import { TemplateEditor } from '@/components/template/template-editor';
import { BatchOperations, TemplateItem } from '@/components/template/batch-operations';

// Types
interface Template {
  id: string;
  name: string;
  description?: string;
  content: string;
  type: 'lesson_plan' | 'flashcard' | 'summary' | 'activity' | 'other';
  variables: TemplateVariable[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    originalName?: string;
    fileSize?: number;
    fileType?: string;
  };
  validation?: ValidationResult;
  tags?: string[];
}

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'validating' | 'valid' | 'invalid';
  errors?: string[];
  variables?: string[];
  progress?: number;
}

export default function TemplateManager() {
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('templates');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated');

  const queryClient = useQueryClient();

  // Mock data for demonstration
  const mockTemplates: Template[] = [
    {
      id: '1',
      name: 'Basic Lesson Plan',
      description: 'A simple lesson plan template for beginners',
      content: '# {{lessonTitle}}\n\n## Objectives\n- {{objective1}}\n- {{objective2}}\n\n## Duration\n{{duration}} minutes\n\n## Materials\n- {{material1}}\n- {{material2}}',
      type: 'lesson_plan',
      variables: [
        { name: 'lessonTitle', type: 'string', required: true, description: 'Title of the lesson' },
        { name: 'objective1', type: 'string', required: true },
        { name: 'objective2', type: 'string', required: false },
        { name: 'duration', type: 'number', required: true },
        { name: 'material1', type: 'string', required: true },
        { name: 'material2', type: 'string', required: false }
      ],
      metadata: {
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
        originalName: 'lesson-plan-template.md',
        fileSize: 1024,
        fileType: 'text/markdown'
      },
      tags: ['basic', 'beginner']
    },
    {
      id: '2',
      name: 'Vocabulary Flashcard',
      description: 'Template for creating vocabulary flashcards',
      content: '## {{word}}\n\n**Pronunciation:** {{pronunciation}}\n\n**Definition:** {{definition}}\n\n**Example:** {{example}}\n\n**Level:** {{level}}',
      type: 'flashcard',
      variables: [
        { name: 'word', type: 'string', required: true },
        { name: 'pronunciation', type: 'string', required: false },
        { name: 'definition', type: 'string', required: true },
        { name: 'example', type: 'string', required: true },
        { name: 'level', type: 'string', defaultValue: 'intermediate' }
      ],
      metadata: {
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-18T16:45:00Z',
        originalName: 'vocab-flashcard.md',
        fileSize: 512,
        fileType: 'text/markdown'
      },
      tags: ['vocabulary', 'flashcard']
    }
  ];

  // Mock API calls
  const fetchTemplates = async (): Promise<Template[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockTemplates;
  };

  const uploadTemplate = async (file: File): Promise<Template> => {
    // Simulate file upload and processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const content = await file.text();
    const variables = extractVariablesFromContent(content);

    return {
      id: Math.random().toString(36).substring(7),
      name: file.name.replace(/\.[^/.]+$/, ''),
      content,
      type: detectTemplateType(content),
      variables,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        originalName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    };
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Deleting template:', templateId);
  };

  // React Query hooks
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates
  });

  const uploadMutation = useMutation({
    mutationFn: uploadTemplate,
    onSuccess: (newTemplate) => {
      queryClient.setQueryData(['templates'], (old: Template[] = []) => [...old, newTemplate]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    }
  });

  // Utility functions
  const extractVariablesFromContent = (content: string): TemplateVariable[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: TemplateVariable[] = [];
    const matches = [...content.matchAll(regex)];

    matches.forEach(match => {
      const variableName = match[1].trim();
      const existingVar = variables.find(v => v.name === variableName);

      if (!existingVar) {
        let type: TemplateVariable['type'] = 'string';
        if (variableName.toLowerCase().includes('count') || variableName.toLowerCase().includes('number')) {
          type = 'number';
        } else if (variableName.toLowerCase().includes('date') || variableName.toLowerCase().includes('time')) {
          type = 'date';
        }

        variables.push({
          name: variableName,
          type,
          required: variableName.toLowerCase().includes('title') || variableName.toLowerCase().includes('name')
        });
      }
    });

    return variables;
  };

  const detectTemplateType = (content: string): Template['type'] => {
    if (content.toLowerCase().includes('lesson') || content.toLowerCase().includes('objective')) {
      return 'lesson_plan';
    }
    if (content.toLowerCase().includes('word') || content.toLowerCase().includes('definition')) {
      return 'flashcard';
    }
    if (content.toLowerCase().includes('summary') || content.toLowerCase().includes('conclusion')) {
      return 'summary';
    }
    if (content.toLowerCase().includes('activity') || content.toLowerCase().includes('exercise')) {
      return 'activity';
    }
    return 'other';
  };

  // Filter and sort templates
  const filteredTemplates = templates
    .filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || template.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime();
        case 'updated':
        default:
          return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime();
      }
    });

  // Event handlers
  const handleFilesUploaded = async (uploadedFiles: UploadedFile[]) => {
    const validFiles = uploadedFiles.filter(f => f.status === 'valid');

    for (const uploadedFile of validFiles) {
      try {
        await uploadMutation.mutateAsync(uploadedFile.file);
      } catch (error) {
        console.error('Failed to upload template:', error);
      }
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const handlePreviewTemplate = (template: Template) => {
    setPreviewTemplate(template);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      await deleteMutation.mutateAsync(template.id);
    }
  };

  const handleSaveTemplate = (content: string, variables: TemplateVariable[]) => {
    if (!editingTemplate) return;

    const updatedTemplate = {
      ...editingTemplate,
      content,
      variables,
      metadata: {
        ...editingTemplate.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    queryClient.setQueryData(['templates'], (old: Template[] = []) =>
      old.map(t => t.id === editingTemplate.id ? updatedTemplate : t)
    );

    setEditingTemplate(null);
  };

  const getTypeColor = (type: Template['type']) => {
    switch (type) {
      case 'lesson_plan': return 'bg-blue-100 text-blue-800';
      case 'flashcard': return 'bg-green-100 text-green-800';
      case 'summary': return 'bg-purple-100 text-purple-800';
      case 'activity': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Template Manager</h1>
            <p className="text-muted-foreground">Upload, manage, and organize your lesson templates</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Template Files</DialogTitle>
              </DialogHeader>
              <TemplateUploadZone
                onFilesChange={handleFilesUploaded}
                maxFiles={10}
                maxSize={10}
                accept={['.md', '.txt', '.docx', '.pdf']}
                extractVariables={true}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="batch">Batch Operations</TabsTrigger>
            <TabsTrigger value="validate">Validate All</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {/* Search and Filters */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Types</option>
                  <option value="lesson_plan">Lesson Plans</option>
                  <option value="flashcard">Flashcards</option>
                  <option value="summary">Summaries</option>
                  <option value="activity">Activities</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="updated">Last Updated</option>
                  <option value="created">Date Created</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </Card>

            {/* Templates Grid */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading templates...</p>
              </div>
            ) : error ? (
              <Card className="p-8 text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">Failed to load templates</p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['templates'] })}>
                  Retry
                </Button>
              </Card>
            ) : filteredTemplates.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No templates found</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Your First Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Upload Template Files</DialogTitle>
                    </DialogHeader>
                    <TemplateUploadZone
                      onFilesChange={handleFilesUploaded}
                      maxFiles={10}
                      maxSize={10}
                      accept={['.md', '.txt', '.docx', '.pdf']}
                      extractVariables={true}
                    />
                  </DialogContent>
                </Dialog>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={cn(
                      'p-4 cursor-pointer transition-all hover:shadow-md',
                      selectedTemplates.has(template.id) && 'ring-2 ring-primary'
                    )}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{template.name}</h3>
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedTemplates.has(template.id)}
                          onChange={() => handleTemplateSelect(template.id)}
                          className="ml-2"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs', getTypeColor(template.type))}>
                          {template.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.variables.length} variables
                        </Badge>
                      </div>

                      {template.validation && (
                        <div className="flex items-center gap-2">
                          {template.validation.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            Score: {template.validation.score.overall}%
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{formatFileSize(template.metadata.fileSize)}</span>
                        <span>{new Date(template.metadata.updatedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewTemplate(template);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor">
            <TemplateEditor
              onSave={handleSaveTemplate}
              onPreview={(content) => console.log('Preview:', content)}
              autoSave={true}
              maxHistory={50}
            />
          </TabsContent>

          {/* Batch Operations Tab */}
          <TabsContent value="batch">
            <BatchOperations
              templates={templates.map(t => ({
                id: t.id,
                name: t.name,
                type: t.type,
                content: t.content,
                variables: t.variables.map(v => v.name),
                status: 'pending' as const
              }))}
              selectedTemplates={selectedTemplates}
              onSelectionChange={setSelectedTemplates}
              onTemplatesUpdate={(updatedItems) => {
                // Update templates in cache
                queryClient.setQueryData(['templates'], (old: Template[] = []) =>
                  old.map(template => {
                    const updatedItem = updatedItems.find(item => item.id === template.id);
                    return updatedItem ? { ...template, ...updatedItem } : template;
                  })
                );
              }}
            />
          </TabsContent>

          {/* Validate All Tab */}
          <TabsContent value="validate" className="space-y-6">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-4">Validate All Templates</h3>
              <p className="text-muted-foreground mb-6">
                Run comprehensive validation on all your templates to check for errors and improve quality
              </p>
              <Button size="lg">
                <Zap className="mr-2 h-4 w-4" />
                Start Validation
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            {previewTemplate && (
              <TemplatePreview
                template={previewTemplate}
                variables={previewTemplate.variables}
                onPreviewInNewTab={(templateId) => {
                  const template = templates.find(t => t.id === templateId);
                  if (template) {
                    // Open in new tab or window
                    const newWindow = window.open('', '_blank');
                    if (newWindow) {
                      newWindow.document.write(`
                        <html>
                          <head><title>${template.name}</title></head>
                          <body style="font-family: sans-serif; padding: 2rem;">
                            <h1>${template.name}</h1>
                            <div>${template.content}</div>
                          </body>
                        </html>
                      `);
                      newWindow.document.close();
                    }
                  }
                }}
                onDownload={(templateId) => {
                  const template = templates.find(t => t.id === templateId);
                  if (template) {
                    const blob = new Blob([template.content], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${template.name}.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template: {editingTemplate?.name}</DialogTitle>
            </DialogHeader>
            {editingTemplate && (
              <TemplateEditor
                initialContent={editingTemplate.content}
                initialVariables={editingTemplate.variables}
                onSave={handleSaveTemplate}
                onPreview={(content) => console.log('Preview edited content:', content)}
                autoSave={true}
                maxHistory={50}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}