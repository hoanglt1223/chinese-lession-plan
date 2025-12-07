import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  Settings,
  CheckCircle,
  Clock,
  FileText,
  Zap,
  Shield,
  Activity,
  Filter,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationError {
  id: string;
  type: 'upload' | 'template' | 'generation' | 'validation' | 'export';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details: string;
  timestamp: Date;
  itemId?: string;
  itemName?: string;
  retryCount: number;
  maxRetries: number;
  autoRetry: boolean;
  context?: {
    step: string;
    data: any;
    environment: any;
  };
  resolution?: {
    attempted: string[];
    successful: boolean;
    finalAction: string;
  };
}

interface ErrorRecoveryProps {
  errors: GenerationError[];
  onRetry?: (errorId: string) => void;
  onClear?: (errorId: string) => void;
  onClearAll?: () => void;
  onExportErrors?: (errorIds: string[]) => void;
  autoRetryEnabled?: boolean;
  maxAutoRetries?: number;
  className?: string;
}

const mockErrors: GenerationError[] = [
  {
    id: '1',
    type: 'upload',
    severity: 'medium',
    title: 'File Processing Failed',
    message: 'Unable to extract text from PDF file',
    details: 'The uploaded PDF appears to be password-protected or corrupted. Please check the file and try again.',
    timestamp: new Date(Date.now() - 300000),
    itemId: 'file-123',
    itemName: 'lesson-plan.pdf',
    retryCount: 1,
    maxRetries: 3,
    autoRetry: false,
    context: {
      step: 'upload',
      data: { fileName: 'lesson-plan.pdf', fileSize: '2.5MB' }
    }
  },
  {
    id: '2',
    type: 'generation',
    severity: 'high',
    title: 'AI Generation Timeout',
    message: 'Generation process exceeded maximum time limit',
    details: 'The AI generation process took longer than the allocated 300 seconds. This may be due to large content size or server load.',
    timestamp: new Date(Date.now() - 600000),
    itemId: 'gen-456',
    itemName: 'Chinese Numbers Lesson',
    retryCount: 2,
    maxRetries: 3,
    autoRetry: true,
    resolution: {
      attempted: ['retry_with_smaller_content', 'increase_timeout'],
      successful: false,
      finalAction: 'user_intervention_required'
    }
  },
  {
    id: '3',
    type: 'template',
    severity: 'low',
    title: 'Template Variable Missing',
    message: 'Required template variable not provided',
    details: 'The template requires a "learningObjectives" variable which was not provided in the input data.',
    timestamp: new Date(Date.now() - 900000),
    itemId: 'tpl-789',
    itemName: 'Interactive Lesson Plan',
    retryCount: 0,
    maxRetries: 3,
    autoRetry: false
  }
];

export function ErrorRecovery({
  errors = mockErrors,
  onRetry,
  onClear,
  onClearAll,
  onExportErrors,
  autoRetryEnabled = true,
  maxAutoRetries = 3,
  className
}: ErrorRecoveryProps) {
  const [selectedErrors, setSelectedErrors] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);

  const filteredErrors = errors.filter(error => {
    const matchesSearch = error.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || error.type === filterType;
    const matchesSeverity = filterSeverity === 'all' || error.severity === filterSeverity;

    return matchesSearch && matchesType && matchesSeverity;
  });

  const errorCounts = {
    total: errors.length,
    critical: errors.filter(e => e.severity === 'critical').length,
    high: errors.filter(e => e.severity === 'high').length,
    medium: errors.filter(e => e.severity === 'medium').length,
    low: errors.filter(e => e.severity === 'low').length
  };

  const handleRetry = useCallback((errorId: string) => {
    onRetry?.(errorId);
  }, [onRetry]);

  const handleClear = useCallback((errorId: string) => {
    onClear?.(errorId);
    setSelectedErrors(prev => prev.filter(id => id !== errorId));
  }, [onClear]);

  const handleAutoRetryAll = useCallback(() => {
    setIsAutoRetrying(true);

    const retryableErrors = errors.filter(error =>
      error.retryCount < error.maxRetries &&
      (autoRetryEnabled || error.autoRetry)
    );

    retryableErrors.forEach((error, index) => {
      setTimeout(() => {
        handleRetry(error.id);
      }, index * 1000); // Stagger retries by 1 second
    });

    setTimeout(() => {
      setIsAutoRetrying(false);
    }, retryableErrors.length * 1000);
  }, [errors, autoRetryEnabled, handleRetry]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      case 'high': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-500 bg-blue-50 border-blue-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'upload': return FileText;
      case 'generation': return Zap;
      case 'template': return Settings;
      case 'validation': return Shield;
      case 'export': return Download;
      default: return AlertTriangle;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'upload': return 'text-blue-500';
      case 'generation': return 'text-purple-500';
      case 'template': return 'text-green-500';
      case 'validation': return 'text-orange-500';
      case 'export': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const canRetry = (error: GenerationError) => {
    return error.retryCount < error.maxRetries;
  };

  const retryableErrorsCount = errors.filter(canRetry).length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Error Recovery & Management
              </CardTitle>
              <CardDescription>
                Monitor, troubleshoot, and recover from generation errors
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {errors.length > 0 && (
                <Badge variant={errorCounts.critical > 0 ? "destructive" : "secondary"}>
                  {errors.length} Errors
                </Badge>
              )}
              {retryableErrorsCount > 0 && (
                <Button
                  onClick={handleAutoRetryAll}
                  disabled={isAutoRetrying}
                  variant="outline"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isAutoRetrying && "animate-spin")} />
                  Auto Retry All ({retryableErrorsCount})
                </Button>
              )}
              {errors.length > 0 && (
                <Button variant="outline" onClick={onClearAll}>
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {errors.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{errorCounts.critical}</div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-500">{errorCounts.high}</div>
                <div className="text-sm text-muted-foreground">High</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{errorCounts.medium}</div>
                <div className="text-sm text-muted-foreground">Medium</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-500">{errorCounts.low}</div>
                <div className="text-sm text-muted-foreground">Low</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{errorCounts.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      {errors.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search errors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-md"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Types</option>
                <option value="upload">Upload</option>
                <option value="generation">Generation</option>
                <option value="template">Template</option>
                <option value="validation">Validation</option>
                <option value="export">Export</option>
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Error Log ({filteredErrors.length})</CardTitle>
            {selectedErrors.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedErrors.length} selected</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExportErrors?.(selectedErrors)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    selectedErrors.forEach(id => handleClear(id));
                    setSelectedErrors([]);
                  }}
                >
                  Clear Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {filteredErrors.length > 0 ? (
              <div className="space-y-4">
                {filteredErrors.map((error) => {
                  const TypeIcon = getTypeIcon(error.type);
                  const isSelected = selectedErrors.includes(error.id);
                  const isRetryable = canRetry(error);

                  return (
                    <div
                      key={error.id}
                      className={cn(
                        "border rounded-lg p-4 cursor-pointer transition-all",
                        getSeverityColor(error.severity),
                        isSelected && "ring-2 ring-primary"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedErrors(prev => [...prev, error.id]);
                            } else {
                              setSelectedErrors(prev => prev.filter(id => id !== error.id));
                            }
                          }}
                          className="mt-1"
                        />

                        <TypeIcon className={cn("w-5 h-5 mt-1 flex-shrink-0", getTypeColor(error.type))} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{error.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {error.type}
                              </Badge>
                              <Badge
                                variant={error.severity === 'critical' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {error.severity}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {error.timestamp.toLocaleString()}
                            </div>
                          </div>

                          <p className="text-sm mb-2">{error.message}</p>
                          <p className="text-sm text-muted-foreground mb-3">{error.details}</p>

                          {error.itemName && (
                            <div className="text-sm mb-2">
                              <span className="font-medium">Item:</span> {error.itemName}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              Retry: {error.retryCount}/{error.maxRetries}
                              {error.autoRetry && ' • Auto-retry enabled'}
                            </div>

                            <div className="flex items-center gap-2">
                              {isRetryable && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetry(error.id)}
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Retry
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClear(error.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Clear
                              </Button>

                              <Button variant="outline" size="sm">
                                <Eye className="w-3 h-3 mr-1" />
                                Details
                              </Button>
                            </div>
                          </div>

                          {/* Resolution Status */}
                          {error.resolution && (
                            <div className="mt-3 p-2 bg-white/50 rounded text-xs">
                              <div className="font-medium mb-1">Resolution Attempts:</div>
                              <ul className="space-y-1">
                                {error.resolution.attempted.map((attempt, index) => (
                                  <li key={index} className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    {attempt}
                                  </li>
                                ))}
                                {!error.resolution.successful && (
                                  <li className="flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                    {error.resolution.finalAction}
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium text-green-900 mb-2">No Errors Found</h3>
                <p className="text-muted-foreground">
                  All systems are running smoothly. No errors to display.
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recovery Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {errorCounts.critical > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Critical errors detected.</strong> Immediate attention required.
                    These errors may block the generation process completely.
                  </AlertDescription>
                </Alert>
              )}

              {errorCounts.high > 0 && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>High severity errors.</strong> Consider addressing these soon
                    to prevent workflow disruption.
                  </AlertDescription>
                </Alert>
              )}

              {retryableErrorsCount > errors.length * 0.3 && (
                <Alert>
                  <RefreshCw className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Many errors are retryable.</strong> Use the auto-retry feature
                    to automatically attempt recovery for multiple errors.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Quick Actions:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Check file formats and sizes before upload</li>
                    <li>• Verify template variables are properly configured</li>
                    <li>• Monitor API rate limits and server load</li>
                    <li>• Enable auto-retry for transient errors</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Best Practices:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Start with smaller content batches</li>
                    <li>• Review error patterns for common issues</li>
                    <li>• Keep templates and files well-organized</li>
                    <li>• Monitor error trends over time</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}