import { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Eye,
  Edit,
  Download,
  Copy,
  Search,
  Zap,
  FileText,
  Code,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'lesson' | 'vocabulary';
  position: number;
  context?: string;
  defaultValue?: string;
  required?: boolean;
}

interface TemplatePreviewProps {
  template: {
    id: string;
    name: string;
    description?: string;
    content: string;
    type: 'lesson_plan' | 'flashcard' | 'summary' | 'activity' | 'other';
    fileMetadata?: {
      originalName: string;
      size: number;
      uploadDate: string;
      fileType: string;
    };
  };
  variables: TemplateVariable[];
  isEditing?: boolean;
  onContentChange?: (content: string) => void;
  onVariableClick?: (variable: TemplateVariable) => void;
  onPreviewInNewTab?: (templateId: string) => void;
  onDownload?: (templateId: string) => void;
  onCopyContent?: (content: string) => void;
  className?: string;
}

export function TemplatePreview({
  template,
  variables,
  isEditing = false,
  onContentChange,
  onVariableClick,
  onPreviewInNewTab,
  onDownload,
  onCopyContent,
  className
}: TemplatePreviewProps) {
  const [highlightedVariable, setHighlightedVariable] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Highlight template variables in content
  const highlightedContent = useMemo(() => {
    let content = template.content;

    // Highlight search terms
    if (searchTerm) {
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      content = content.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>');
    }

    // Highlight template variables
    content = content.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const variable = variables.find(v => v.name === variableName.trim());
      const isHighlighted = highlightedVariable === variableName.trim();
      const isRequired = variable?.required;

      let bgColor = 'bg-blue-100 text-blue-800';
      if (isHighlighted) bgColor = 'bg-blue-200 text-blue-900';
      if (isRequired) bgColor = 'bg-orange-100 text-orange-800';
      if (isHighlighted && isRequired) bgColor = 'bg-orange-200 text-orange-900';

      return `<span
        class="${bgColor} px-2 py-1 rounded cursor-pointer font-mono text-sm inline-block"
        data-variable="${variableName.trim()}"
        title="${variable?.type || 'string'}${isRequired ? ' (required)' : ''}"
      >{{${variableName.trim()}}}</span>`;
    });

    return content;
  }, [template.content, variables, highlightedVariable, searchTerm]);

  // Handle variable click
  const handleVariableClick = useCallback((variableName: string) => {
    setHighlightedVariable(variableName);
    const variable = variables.find(v => v.name === variableName);
    if (variable && onVariableClick) {
      onVariableClick(variable);
    }
  }, [variables, onVariableClick]);

  // Copy to clipboard
  const handleCopyContent = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(template.content);
      if (onCopyContent) {
        onCopyContent(template.content);
      }
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  }, [template.content, onCopyContent]);

  // Get template type badge color
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'lesson_plan': return 'default';
      case 'flashcard': return 'secondary';
      case 'summary': return 'outline';
      case 'activity': return 'destructive';
      default: return 'secondary';
    }
  };

  // Get variable type icon
  const getVariableTypeIcon = (type: TemplateVariable['type']) => {
    switch (type) {
      case 'string': return <FileText className="h-3 w-3" />;
      case 'number': return <span className="text-xs font-mono">#</span>;
      case 'date': return <span className="text-xs">📅</span>;
      case 'lesson': return <BookOpen className="h-3 w-3" />;
      case 'vocabulary': return <Zap className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render content based on type
  const renderContent = (isRaw: boolean = false) => {
    if (isRaw) {
      return (
        <pre className="text-sm bg-muted/50 p-4 rounded-lg overflow-x-auto">
          <code>{template.content}</code>
        </pre>
      );
    }

    return (
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.dataset.variable) {
            handleVariableClick(target.dataset.variable);
          }
        }}
      />
    );
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-muted/50 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-muted-foreground truncate">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge variant={getTypeBadgeVariant(template.type)}>
              {template.type.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">
              {variables.length} variables
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {template.fileMetadata && (
              <span className="text-xs text-muted-foreground">
                {template.fileMetadata.originalName} • {formatFileSize(template.fileMetadata.size)}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyContent}
                  title="Copy content"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreviewInNewTab?.(template.id)}
                  title="Preview in new tab"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload?.(template.id)}
                  title="Download template"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600"
                title="Editing mode"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content and Variables */}
      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 p-4">
          {/* Search */}
          {!isEditing && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search in template..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Content Tabs */}
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="raw" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Raw Content
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-4">
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                {isEditing ? (
                  <textarea
                    value={template.content}
                    onChange={(e) => onContentChange?.(e.target.value)}
                    className="w-full h-full min-h-[400px] p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter template content..."
                  />
                ) : (
                  renderContent(false)
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="raw" className="mt-4">
              <ScrollArea className="h-[400px]">
                {renderContent(true)}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Variables Panel */}
        {variables.length > 0 && (
          <div className="lg:w-80 border-t lg:border-t-0 lg:border-l p-4 bg-muted/20">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Template Variables
            </h4>

            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {variables.map((variable) => (
                  <div
                    key={variable.name}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-colors',
                      highlightedVariable === variable.name
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background hover:bg-muted/50'
                    )}
                    onClick={() => handleVariableClick(variable.name)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm font-mono text-primary">
                        {`{{${variable.name}}}`}
                      </code>
                      {variable.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      {getVariableTypeIcon(variable.type)}
                      <span>{variable.type}</span>
                      {variable.defaultValue && (
                        <span>• Default: {variable.defaultValue}</span>
                      )}
                    </div>

                    {variable.context && (
                      <p className="text-xs text-muted-foreground italic">
                        Context: {variable.context}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Variables Summary */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2 font-medium">{variables.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Required:</span>
                  <span className="ml-2 font-medium text-orange-600">
                    {variables.filter(v => v.required).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}