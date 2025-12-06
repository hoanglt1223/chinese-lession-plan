import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Undo,
  Redo,
  Save,
  Eye,
  Code,
  Type,
  Zap,
  Search,
  Replace,
  CheckCircle,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'lesson' | 'vocabulary' | 'boolean';
  defaultValue?: string;
  required?: boolean;
  description?: string;
}

interface HistoryEntry {
  content: string;
  timestamp: number;
  variables: TemplateVariable[];
  description?: string;
}

interface TemplateEditorProps {
  initialContent?: string;
  initialVariables?: TemplateVariable[];
  onSave?: (content: string, variables: TemplateVariable[]) => void;
  onPreview?: (content: string) => void;
  readOnly?: boolean;
  autoSave?: boolean;
  maxHistory?: number;
  className?: string;
}

export function TemplateEditor({
  initialContent = '',
  initialVariables = [],
  onSave,
  onPreview,
  readOnly = false,
  autoSave = false,
  maxHistory = 50,
  className
}: TemplateEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [variables, setVariables] = useState<TemplateVariable[]>(initialVariables);
  const [history, setHistory] = useState<HistoryEntry[]>([
    { content: initialContent, timestamp: Date.now(), variables: initialVariables }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !onSave) return;

    const timer = setTimeout(() => {
      if (content !== initialContent) {
        onSave(content, variables);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [content, variables, autoSave, onSave, initialContent]);

  // Add to history
  const addToHistory = useCallback((newContent: string, newVariables: TemplateVariable[], description?: string) => {
    const newEntry: HistoryEntry = {
      content: newContent,
      timestamp: Date.now(),
      variables: newVariables,
      description
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newEntry);
      // Keep only the last maxHistory entries
      return newHistory.slice(-maxHistory);
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistory - 1));
  }, [historyIndex, maxHistory]);

  // Undo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const entry = history[newIndex];
      setContent(entry.content);
      setVariables(entry.variables);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Redo functionality
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const entry = history[newIndex];
      setContent(entry.content);
      setVariables(entry.variables);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    if (readOnly) return;

    setContent(newContent);

    // Extract variables from new content
    const extractedVariables = extractVariables(newContent);
    setVariables(extractedVariables);

    // Add to history with debouncing
    const timer = setTimeout(() => {
      addToHistory(newContent, extractedVariables, 'Content change');
    }, 500);

    return () => clearTimeout(timer);
  }, [readOnly, addToHistory]);

  // Extract template variables from content
  const extractVariables = (text: string): TemplateVariable[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const foundVariables: TemplateVariable[] = [];
    const matches = [...text.matchAll(regex)];

    matches.forEach(match => {
      const variableName = match[1].trim();
      const existingVar = foundVariables.find(v => v.name === variableName);

      if (!existingVar) {
        // Infer variable type based on name patterns
        let type: TemplateVariable['type'] = 'string';
        if (variableName.toLowerCase().includes('age') || variableName.toLowerCase().includes('level')) {
          type = 'string';
        } else if (variableName.toLowerCase().includes('count') || variableName.toLowerCase().includes('number')) {
          type = 'number';
        } else if (variableName.toLowerCase().includes('date') || variableName.toLowerCase().includes('time')) {
          type = 'date';
        } else if (variableName.toLowerCase().includes('lesson')) {
          type = 'lesson';
        } else if (variableName.toLowerCase().includes('vocab') || variableName.toLowerCase().includes('word')) {
          type = 'vocabulary';
        } else if (variableName.toLowerCase().includes('is') || variableName.toLowerCase().includes('has') || variableName.toLowerCase().includes('should')) {
          type = 'boolean';
        }

        // Determine if variable is required (heuristic)
        const isRequired = variableName.toLowerCase().includes('required') ||
                           variableName.toLowerCase().includes('name') ||
                           variableName.toLowerCase().includes('title');

        foundVariables.push({
          name: variableName,
          type,
          required: isRequired
        });
      }
    });

    return foundVariables;
  };

  // Search and replace functionality
  const handleSearch = useCallback(() => {
    if (!textareaRef.current || !searchTerm) return;

    const textarea = textareaRef.current;
    const text = textarea.value;
    const searchIndex = text.indexOf(searchTerm, textarea.selectionEnd);

    if (searchIndex !== -1) {
      textarea.focus();
      textarea.setSelectionRange(searchIndex, searchIndex + searchTerm.length);
      setCursorPosition(searchIndex);
    }
  }, [searchTerm]);

  const handleReplace = useCallback(() => {
    if (!textareaRef.current || !searchTerm || !replaceTerm) return;

    const textarea = textareaRef.current;
    const text = textarea.value;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    if (textarea.value.substring(selectionStart, selectionEnd) === searchTerm) {
      const newText = text.substring(0, selectionStart) + replaceTerm + text.substring(selectionEnd);
      handleContentChange(newText);

      // Move cursor to after replacement
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(selectionStart + replaceTerm.length, selectionStart + replaceTerm.length);
      }, 0);
    }
  }, [searchTerm, replaceTerm, handleContentChange]);

  const handleReplaceAll = useCallback(() => {
    if (!searchTerm || !replaceTerm) return;

    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newContent = content.replace(regex, replaceTerm);
    handleContentChange(newContent);
  }, [content, searchTerm, replaceTerm, handleContentChange]);

  // Insert variable at cursor position
  const insertVariable = useCallback((variable: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variableText = `{{${variable}}}`;

    const newContent = content.substring(0, start) + variableText + content.substring(end);
    handleContentChange(newContent);

    // Move cursor after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableText.length, start + variableText.length);
    }, 0);
  }, [content, handleContentChange]);

  // Variable management
  const addVariable = useCallback((name: string) => {
    const newVariable: TemplateVariable = {
      name,
      type: 'string',
      required: false
    };
    setVariables(prev => [...prev, newVariable]);
    insertVariable(name);
  }, [insertVariable]);

  const deleteVariable = useCallback((name: string) => {
    setVariables(prev => prev.filter(v => v.name !== name));
  }, []);

  const updateVariable = useCallback((oldName: string, updatedVariable: TemplateVariable) => {
    setVariables(prev => prev.map(v => v.name === oldName ? updatedVariable : v));

    // Replace variable in content if name changed
    if (oldName !== updatedVariable.name) {
      const regex = new RegExp(`\\{\\{${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
      const newContent = content.replace(regex, `{{${updatedVariable.name}}}`);
      handleContentChange(newContent);
    }
  }, [content, handleContentChange]);

  // Render preview with highlighted variables
  const renderPreview = useMemo(() => {
    let previewContent = content;

    // Highlight variables
    previewContent = previewContent.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const variable = variables.find(v => v.name === variableName.trim());
      const required = variable?.required || false;

      return `<span class="inline-flex items-center px-2 py-1 rounded-md text-sm font-mono ${
        required ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
      }">
        ${match}
      </span>`;
    });

    // Convert markdown-like syntax to HTML
    previewContent = previewContent
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br />');

    return `<div class="prose prose-sm max-w-none p-4"><p class="mb-4">${previewContent}</p></div>`;
  }, [content, variables]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const hasChanges = content !== initialContent;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!canUndo || readOnly}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!canRedo || readOnly}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Search/Replace */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearchReplace(!showSearchReplace)}
              title="Search & Replace"
            >
              <Search className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* View Mode */}
            <Button
              variant={isPreviewMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              {isPreviewMode ? <Type className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            {/* Preview in new tab */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreview?.(content)}
              title="Preview in new tab"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                Unsaved changes
              </Badge>
            )}

            <Button
              onClick={() => onSave?.(content, variables)}
              disabled={!hasChanges || readOnly}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Search/Replace Bar */}
        {showSearchReplace && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Replace with..."
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                className="px-3 py-1 border rounded text-sm"
              />
              <Button size="sm" onClick={handleSearch} disabled={!searchTerm}>
                Find
              </Button>
              <Button size="sm" variant="outline" onClick={handleReplace} disabled={!searchTerm}>
                Replace
              </Button>
              <Button size="sm" variant="outline" onClick={handleReplaceAll} disabled={!searchTerm}>
                Replace All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSearchReplace(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Editor */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <Tabs value={isPreviewMode ? 'preview' : 'edit'} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit" onClick={() => setIsPreviewMode(false)}>
                  <Type className="h-4 w-4 mr-2" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" onClick={() => setIsPreviewMode(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="m-0">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  readOnly={readOnly}
                  placeholder="Enter your template content here..."
                  className="min-h-[500px] border-0 resize-none font-mono text-sm focus:ring-0"
                  style={{ tabSize: 2 }}
                />
              </TabsContent>

              <TabsContent value="preview" className="m-0">
                <ScrollArea className="h-[500px]">
                  <div dangerouslySetInnerHTML={{ __html: renderPreview }} />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Variables Panel */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Variables
              </h3>
              <Badge variant="secondary">{variables.length}</Badge>
            </div>

            {/* Add Variable */}
            {!readOnly && (
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Variable name..."
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        addVariable(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.parentElement?.querySelector('input');
                      if (input?.value.trim()) {
                        addVariable(input.value.trim());
                        input.value = '';
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Variables List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {variables.map(variable => (
                  <div
                    key={variable.name}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm font-mono text-primary">
                        {`{{${variable.name}}}`}
                      </code>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteVariable(variable.name)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{variable.type}</span>
                      {variable.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {variable.defaultValue && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Default: {variable.defaultValue}
                      </p>
                    )}
                    {variable.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {variable.description}
                      </p>
                    )}
                  </div>
                ))}

                {variables.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No variables found</p>
                    <p className="text-xs">Add {{variable}} in your content</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .prose h1, .prose h2, .prose h3 {
          font-weight: 600;
          line-height: 1.25;
        }
      `}</style>
    </div>
  );
}