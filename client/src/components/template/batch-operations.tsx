import { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  Trash2,
  Copy,
  FileText,
  Zap,
  List,
  Settings,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TemplateItem {
  id: string;
  name: string;
  type: string;
  content: string;
  variables: string[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

export interface BatchOperation {
  id: string;
  type: 'validate' | 'export' | 'transform' | 'delete' | 'copy' | 'analyze';
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  totalItems: number;
  processedItems: number;
  errors: number;
  startTime?: number;
  endTime?: number;
}

interface BatchOperationsProps {
  templates: TemplateItem[];
  selectedTemplates: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onOperationComplete?: (operation: BatchOperation, results: any[]) => void;
  onTemplatesUpdate?: (templates: TemplateItem[]) => void;
  className?: string;
}

export function BatchOperations({
  templates,
  selectedTemplates,
  onSelectionChange,
  onOperationComplete,
  onTemplatesUpdate,
  className
}: BatchOperationsProps) {
  const [currentOperation, setCurrentOperation] = useState<BatchOperation | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [operationResults, setOperationResults] = useState<any[]>([]);

  // Available batch operations
  const availableOperations: Omit<BatchOperation, 'status' | 'progress' | 'totalItems' | 'processedItems' | 'errors'>[] = [
    {
      id: 'validate',
      type: 'validate',
      name: 'Validate Templates',
      description: 'Check syntax and variables in selected templates',
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      id: 'export',
      type: 'export',
      name: 'Export Templates',
      description: 'Export selected templates to various formats',
      icon: <Download className="h-4 w-4" />
    },
    {
      id: 'transform',
      type: 'transform',
      name: 'Transform Variables',
      description: 'Update variable names or types across templates',
      icon: <Settings className="h-4 w-4" />
    },
    {
      id: 'analyze',
      type: 'analyze',
      name: 'Analyze Usage',
      description: 'Analyze variable usage patterns across templates',
      icon: <List className="h-4 w-4" />
    },
    {
      id: 'copy',
      type: 'copy',
      name: 'Duplicate Templates',
      description: 'Create copies of selected templates',
      icon: <Copy className="h-4 w-4" />
    },
    {
      id: 'delete',
      type: 'delete',
      name: 'Delete Templates',
      description: 'Permanently delete selected templates',
      icon: <Trash2 className="h-4 w-4" />
    }
  ];

  // Start a batch operation
  const startOperation = useCallback(async (operationType: BatchOperation['type']) => {
    if (selectedTemplates.size === 0) {
      alert('Please select templates to operate on');
      return;
    }

    const operationConfig = availableOperations.find(op => op.type === operationType);
    if (!operationConfig) return;

    const operation: BatchOperation = {
      ...operationConfig,
      status: 'running',
      progress: 0,
      totalItems: selectedTemplates.size,
      processedItems: 0,
      errors: 0,
      startTime: Date.now()
    };

    setCurrentOperation(operation);
    setIsPaused(false);
    setOperationResults([]);

    // Process templates
    const selectedArray = Array.from(selectedTemplates);
    const results: any[] = [];

    for (let i = 0; i < selectedArray.length; i++) {
      // Check if paused
      while (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const templateId = selectedArray[i];
      const template = templates.find(t => t.id === templateId);

      if (!template) continue;

      // Update operation progress
      const updatedOperation = {
        ...operation,
        processedItems: i,
        progress: (i / selectedArray.length) * 100
      };
      setCurrentOperation(updatedOperation);

      try {
        let result;

        // Execute specific operation
        switch (operationType) {
          case 'validate':
            result = await validateTemplate(template);
            break;
          case 'export':
            result = await exportTemplate(template);
            break;
          case 'transform':
            result = await transformTemplate(template);
            break;
          case 'analyze':
            result = await analyzeTemplate(template);
            break;
          case 'copy':
            result = await copyTemplate(template);
            break;
          case 'delete':
            result = await deleteTemplate(template);
            break;
          default:
            throw new Error(`Unknown operation type: ${operationType}`);
        }

        results.push(result);

        // Update template status if needed
        if (result.templateUpdated) {
          onTemplatesUpdate?.(templates.map(t =>
            t.id === templateId ? { ...t, ...result.template } : t
          ));
        }

      } catch (error) {
        results.push({
          templateId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Complete operation
    const completedOperation: BatchOperation = {
      ...updatedOperation,
      status: 'completed',
      processedItems: selectedArray.length,
      progress: 100,
      endTime: Date.now()
    };

    setCurrentOperation(completedOperation);
    setOperationResults(results);
    onOperationComplete?.(completedOperation, results);
  }, [selectedTemplates, templates, isPaused, availableOperations, onOperationComplete, onTemplatesUpdate]);

  // Individual operation implementations
  const validateTemplate = async (template: TemplateItem) => {
    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 300));

    const errors: string[] = [];
    const content = template.content;

    // Check for unmatched braces
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unmatched template braces');
    }

    // Check for undefined variables
    const contentVariables = (content.match(/\{\{([^}]+)\}\}/g) || [])
      .map(match => match.replace(/[{}]/g, '').trim());

    contentVariables.forEach(variable => {
      if (!template.variables.includes(variable)) {
        errors.push(`Undefined variable: ${variable}`);
      }
    });

    return {
      templateId: template.id,
      success: errors.length === 0,
      errors,
      validation: {
        totalVariables: template.variables.length,
        contentVariables: contentVariables.length,
        errors: errors.length
      }
    };
  };

  const exportTemplate = async (template: TemplateItem) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate export
    const exportData = {
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        content: template.content,
        variables: template.variables
      },
      exportDate: new Date().toISOString(),
      exportedBy: 'Batch Operations'
    };

    // Create download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      templateId: template.id,
      success: true,
      exportedAs: 'JSON',
      fileName: `${template.name}_export.json`
    };
  };

  const transformTemplate = async (template: TemplateItem) => {
    await new Promise(resolve => setTimeout(resolve, 400));

    // Simple transformation: convert variable names to camelCase
    const camelCaseVariables = template.variables.map(variable => {
      return variable.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    });

    // Update content
    let transformedContent = template.content;
    template.variables.forEach((oldVar, index) => {
      const newVar = camelCaseVariables[index];
      const regex = new RegExp(`\\{\\{${oldVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
      transformedContent = transformedContent.replace(regex, `{{${newVar}}}`);
    });

    return {
      templateId: template.id,
      success: true,
      templateUpdated: true,
      template: {
        variables: camelCaseVariables,
        content: transformedContent
      },
      transformations: template.variables.map((old, index) => ({
        from: old,
        to: camelCaseVariables[index]
      }))
    };
  };

  const analyzeTemplate = async (template: TemplateItem) => {
    await new Promise(resolve => setTimeout(resolve, 200));

    const content = template.content;
    const contentVariables = (content.match(/\{\{([^}]+)\}\}/g) || [])
      .map(match => match.replace(/[{}]/g, '').trim());

    const variableUsage = contentVariables.reduce((acc, variable) => {
      acc[variable] = (acc[variable] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      templateId: template.id,
      success: true,
      analysis: {
        totalContent: content.length,
        totalVariables: contentVariables.length,
        uniqueVariables: Object.keys(variableUsage).length,
        variableUsage,
        complexity: contentVariables.length > 10 ? 'high' : contentVariables.length > 5 ? 'medium' : 'low'
      }
    };
  };

  const copyTemplate = async (template: TemplateItem) => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const newTemplate = {
      ...template,
      id: Math.random().toString(36).substring(7),
      name: `${template.name} (Copy)`,
      status: 'pending' as const
    };

    return {
      templateId: template.id,
      success: true,
      newTemplateId: newTemplate.id,
      newTemplateName: newTemplate.name
    };
  };

  const deleteTemplate = async (template: TemplateItem) => {
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      templateId: template.id,
      success: true,
      deleted: true
    };
  };

  // Template selection handlers
  const toggleTemplateSelection = useCallback((templateId: string) => {
    const newSelection = new Set(selectedTemplates);
    if (newSelection.has(templateId)) {
      newSelection.delete(templateId);
    } else {
      newSelection.add(templateId);
    }
    onSelectionChange?.(newSelection);
  }, [selectedTemplates, onSelectionChange]);

  const selectAll = useCallback(() => {
    onSelectionChange?.(new Set(templates.map(t => t.id)));
  }, [templates, onSelectionChange]);

  const clearSelection = useCallback(() => {
    onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  // Operation control handlers
  const pauseOperation = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeOperation = useCallback(() => {
    setIsPaused(false);
  }, []);

  const cancelOperation = useCallback(() => {
    setCurrentOperation(null);
    setOperationResults([]);
    setIsPaused(false);
  }, []);

  // Format duration
  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const successfulResults = operationResults.filter(r => r.success);
  const failedResults = operationResults.filter(r => !r.success);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Template Selection */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Select Templates</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Badge variant="secondary">
            {selectedTemplates.size} of {templates.length} selected
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {templates.map(template => (
            <div
              key={template.id}
              className={cn(
                'flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors',
                selectedTemplates.has(template.id) ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
              )}
              onClick={() => toggleTemplateSelection(template.id)}
            >
              <Checkbox
                checked={selectedTemplates.has(template.id)}
                onChange={() => toggleTemplateSelection(template.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{template.name}</p>
                <p className="text-xs text-muted-foreground">
                  {template.type} • {template.variables.length} variables
                </p>
              </div>
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      </Card>

      {/* Available Operations */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Batch Operations</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableOperations.map(operation => (
            <Button
              key={operation.id}
              variant="outline"
              className="h-auto p-4 flex-col items-start"
              onClick={() => startOperation(operation.type)}
              disabled={selectedTemplates.size === 0 || (currentOperation?.status === 'running' && !isPaused)}
            >
              <div className="flex items-center gap-2 w-full mb-2">
                {operation.icon}
                <span className="font-medium">{operation.name}</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {operation.description}
              </p>
            </Button>
          ))}
        </div>
      </Card>

      {/* Current Operation */}
      {currentOperation && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {currentOperation.icon}
              <div>
                <h3 className="font-semibold">{currentOperation.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentOperation.processedItems} / {currentOperation.totalItems} items processed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentOperation.status === 'running' && (
                <>
                  {!isPaused ? (
                    <Button variant="outline" size="sm" onClick={pauseOperation}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={resumeOperation}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={cancelOperation}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}

              {currentOperation.status === 'completed' && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <Progress value={currentOperation.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{currentOperation.progress.toFixed(1)}%</span>
              {currentOperation.startTime && (
                <span>
                  {formatDuration(currentOperation.startTime, currentOperation.endTime)}
                </span>
              )}
            </div>
          </div>

          {/* Results Summary */}
          {operationResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">{successfulResults.length}</div>
                <div className="text-xs text-green-600">Successful</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-semibold text-red-600">{failedResults.length}</div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-600">
                  {currentOperation.totalItems}
                </div>
                <div className="text-xs text-blue-600">Total Items</div>
              </div>
            </div>
          )}

          {/* Detailed Results */}
          {operationResults.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Results</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {operationResults.map((result, index) => {
                  const template = templates.find(t => t.id === result.templateId);
                  return (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center justify-between p-2 rounded border',
                        result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">{template?.name || 'Unknown'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {result.success ? (
                          <span className="text-green-600">
                            {result.exportedAs || 'Success'}
                          </span>
                        ) : (
                          <span className="text-red-600">{result.error}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}