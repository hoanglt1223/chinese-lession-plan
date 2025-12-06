import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Eye,
  EyeOff,
  Zap,
  Tag,
  Search,
  Filter,
  Copy,
  Download,
  RotateCcw,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TemplateVariable } from '../../../../shared/types';

interface VariableHighlighterProps {
  content: string;
  variables: TemplateVariable[];
  onVariableSelect?: (variable: TemplateVariable) => void;
  onVariableUpdate?: (oldName: string, updatedVariable: TemplateVariable) => void;
  onVariableDelete?: (variableName: string) => void;
  highlightStyle?: 'background' | 'border' | 'underline' | 'glow';
  showTooltip?: boolean;
  allowEditing?: boolean;
  className?: string;
}

export function VariableHighlighter({
  content,
  variables,
  onVariableSelect,
  onVariableUpdate,
  onVariableDelete,
  highlightStyle = 'background',
  showTooltip = true,
  allowEditing = false,
  className
}: VariableHighlighterProps) {
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
  const [hiddenVariables, setHiddenVariables] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingVariable, setEditingVariable] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TemplateVariable>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  // Filter variables based on search and type
  const filteredVariables = useMemo(() => {
    let filtered = variables;

    if (searchTerm) {
      filtered = filtered.filter(variable =>
        variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variable.context?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(variable => variable.type === filterType);
    }

    return filtered.sort((a, b) => a.position - b.position);
  }, [variables, searchTerm, filterType]);

  // Process content with highlights
  const processedContent = useMemo(() => {
    let processed = content;

    // Sort variables by position in reverse order to avoid position shifting
    const sortedVariables = [...variables].sort((a, b) => b.position - a.position);

    sortedVariables.forEach(variable => {
      const variablePattern = new RegExp(`\\{\\{${variable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
      const isHidden = hiddenVariables.has(variable.name);
      const isSelected = selectedVariable === variable.name;
      const isEditing = editingVariable === variable.name;

      processed = processed.replace(variablePattern, (match) => {
        if (isHidden) {
          return `<span class="variable-placeholder">[Variable Hidden]</span>`;
        }

        const highlightClass = getHighlightClass(variable, isSelected, highlightStyle);
        const tooltip = showTooltip ? getTooltipContent(variable) : '';

        if (isEditing && allowEditing) {
          return `<input
            type="text"
            class="variable-edit-input"
            data-variable="${variable.name}"
            value="{{${variable.name}}}"
            onclick="event.stopPropagation()"
          />`;
        }

        return `<span
          class="template-variable ${highlightClass}"
          data-variable="${variable.name}"
          data-type="${variable.type}"
          data-required="${variable.required || false}"
          ${tooltip ? `title="${tooltip}"` : ''}
        >{{${variable.name}}}</span>`;
      });
    });

    return processed;
  }, [content, variables, hiddenVariables, selectedVariable, editingVariable, highlightStyle, showTooltip, allowEditing]);

  const getHighlightClass = (variable: TemplateVariable, isSelected: boolean, style: string): string => {
    const baseClass = 'font-mono text-sm cursor-pointer transition-all duration-200 ';

    const requiredClass = variable.required ? 'border-orange-300 ' : '';
    const selectedClass = isSelected ? 'ring-2 ring-primary ' : '';

    const typeColors = {
      string: 'text-blue-700',
      number: 'text-green-700',
      date: 'text-purple-700',
      lesson: 'text-indigo-700',
      vocabulary: 'text-pink-700',
      boolean: 'text-gray-700'
    };

    const colorClass = typeColors[variable.type] || 'text-gray-700';

    switch (style) {
      case 'background':
        return baseClass + `px-2 py-1 rounded ${requiredClass}${isSelected ? 'bg-blue-100 ' : variable.required ? 'bg-orange-50 ' : 'bg-gray-50'}${colorClass} ${selectedClass}`;
      case 'border':
        return baseClass + `border-b-2 ${requiredClass}${isSelected ? 'border-blue-500 ' : variable.required ? 'border-orange-400 ' : 'border-gray-300'}${colorClass} ${selectedClass}`;
      case 'underline':
        return baseClass + `underline ${requiredClass}${isSelected ? 'underline-blue-500 underline-2 ' : variable.required ? 'underline-orange-400 ' : 'underline-gray-300'}${colorClass} ${selectedClass}`;
      case 'glow':
        return baseClass + `${requiredClass}${isSelected ? 'shadow-[0_0_8px_rgba(59,130,246,0.5)] ' : variable.required ? 'shadow-[0_0_4px_rgba(251,146,60,0.3)] ' : ''}${colorClass} ${selectedClass}`;
      default:
        return baseClass + colorClass;
    }
  };

  const getTooltipContent = (variable: TemplateVariable): string => {
    const lines = [
      `Type: ${variable.type}`,
      variable.required ? 'Required: Yes' : '',
      variable.defaultValue ? `Default: ${variable.defaultValue}` : '',
      variable.description ? variable.description : ''
    ].filter(Boolean);

    return lines.join(' | ');
  };

  const handleVariableClick = useCallback((variableName: string) => {
    const variable = variables.find(v => v.name === variableName);
    if (variable) {
      setSelectedVariable(variableName);
      onVariableSelect?.(variable);
    }
  }, [variables, onVariableSelect]);

  const toggleVariableVisibility = useCallback((variableName: string) => {
    setHiddenVariables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(variableName)) {
        newSet.delete(variableName);
      } else {
        newSet.add(variableName);
      }
      return newSet;
    });
  }, []);

  const startEditingVariable = useCallback((variable: TemplateVariable) => {
    if (!allowEditing) return;
    setEditingVariable(variable.name);
    setEditForm(variable);
  }, [allowEditing]);

  const saveVariableEdit = useCallback(() => {
    if (!editingVariable || !onVariableUpdate) return;

    const updatedVariable: TemplateVariable = {
      name: editForm.name || editingVariable,
      type: editForm.type || 'string',
      position: variables.find(v => v.name === editingVariable)?.position || 0,
      context: editForm.context,
      defaultValue: editForm.defaultValue,
      required: editForm.required || false,
      description: editForm.description,
      validation: editForm.validation
    };

    onVariableUpdate(editingVariable, updatedVariable);
    setEditingVariable(null);
    setEditForm({});
  }, [editingVariable, editForm, onVariableUpdate, variables]);

  const cancelVariableEdit = useCallback(() => {
    setEditingVariable(null);
    setEditForm({});
  }, []);

  const deleteVariable = useCallback((variableName: string) => {
    if (!onVariableDelete) return;
    onVariableDelete(variableName);
  }, [onVariableDelete]);

  const exportVariables = useCallback(() => {
    const exportData = {
      variables: filteredVariables,
      content: content,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-variables.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredVariables, content]);

  const copyVariablesList = useCallback(() => {
    const variablesText = filteredVariables
      .map(v => `{{${v.name}}} (${v.type})${v.required ? ' *' : ''}`)
      .join('\n');

    navigator.clipboard.writeText(variablesText);
  }, [filteredVariables]);

  const resetVisibility = useCallback(() => {
    setHiddenVariables(new Set());
    setSelectedVariable(null);
  }, []);

  // Add click handlers to processed content
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('template-variable')) {
        const variableName = target.dataset.variable;
        if (variableName) {
          handleVariableClick(variableName);
        }
      }
    };

    contentElement.addEventListener('click', handleClick);
    return () => contentElement.removeEventListener('click', handleClick);
  }, [handleVariableClick]);

  const variableTypes = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'lesson', label: 'Lesson' },
    { value: 'vocabulary', label: 'Vocabulary' },
    { value: 'boolean', label: 'Yes/No' }
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Control Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {variableTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetVisibility}
              title="Reset visibility"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyVariablesList}
              title="Copy variables list"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportVariables}
              title="Export variables"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Content with Highlights */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Template Content
            </h3>
            <div
              ref={contentRef}
              className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg border min-h-[300px] [&_.template-variable]:inline-block [&_.variable-placeholder]:text-muted-foreground italic [&_.variable-edit-input]:px-2 py-1 border rounded"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          </Card>
        </div>

        {/* Variables Panel */}
        <div>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Variables ({filteredVariables.length})
              </h3>
              {hiddenVariables.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {hiddenVariables.size} hidden
                </Badge>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredVariables.map(variable => (
                <div
                  key={variable.name}
                  className={cn(
                    'p-3 border rounded-lg transition-colors',
                    selectedVariable === variable.name
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  {editingVariable === variable.name ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={editForm.type || 'string'}
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, type: value as any }))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {variableTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Default Value</Label>
                        <Input
                          value={editForm.defaultValue || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, defaultValue: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`required-${variable.name}`}
                          checked={editForm.required || false}
                          onChange={(e) => setEditForm(prev => ({ ...prev, required: e.target.checked }))}
                          className="h-3 w-3"
                        />
                        <Label htmlFor={`required-${variable.name}`} className="text-xs">
                          Required
                        </Label>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={saveVariableEdit} className="h-7">
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelVariableEdit} className="h-7">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <code className="text-sm font-mono text-primary break-all">
                            {`{{${variable.name}}}`}
                          </code>
                          {variable.required && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className="capitalize">{variable.type}</span>
                        {variable.defaultValue && (
                          <span>• Default: {variable.defaultValue}</span>
                        )}
                      </div>

                      {variable.context && (
                        <p className="text-xs text-muted-foreground italic mb-2">
                          {variable.context}
                        </p>
                      )}

                      {variable.description && (
                        <p className="text-xs text-muted-foreground mb-3">
                          {variable.description}
                        </p>
                      )}

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVariableClick(variable.name)}
                          className="h-7 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVariableVisibility(variable.name)}
                          className="h-7 px-2"
                        >
                          {hiddenVariables.has(variable.name) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3 opacity-50" />
                          )}
                        </Button>
                        {allowEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingVariable(variable)}
                            className="h-7 px-2"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        )}
                        {allowEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteVariable(variable.name)}
                            className="h-7 px-2 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredVariables.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No variables found</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .template-variable:hover {
          transform: scale(1.05);
        }

        .variable-edit-input {
          font-family: monospace;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}