import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Layers,
  FileText,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
  Settings,
  Filter,
  Search,
  Plus,
  Trash2,
  Download,
  Eye,
  Edit3,
  Copy,
  ArrowUpDown,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchItem {
  id: string;
  name: string;
  type: 'lesson_plan' | 'flashcard' | 'worksheet' | 'activity';
  status: 'pending' | 'running' | 'completed' | 'error' | 'paused';
  progress: number;
  files: string[];
  template: string;
  language: string;
  settings: Record<string, any>;
  result?: {
    content: string;
    quality: number;
    wordCount: number;
    imageCount: number;
  };
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface BatchGenerationProps {
  onBatchComplete?: (batchId: string, results: any[]) => void;
  onItemComplete?: (itemId: string, result: any) => void;
  maxConcurrent?: number;
  className?: string;
}

const mockBatchItems: BatchItem[] = [
  {
    id: '1',
    name: 'Chinese Numbers Lesson Series',
    type: 'lesson_plan',
    status: 'completed',
    progress: 100,
    files: ['numbers-basics.pdf', 'counting-activities.docx'],
    template: 'Interactive Lesson Plan',
    language: 'zh',
    settings: { ageGroup: 'primary', difficulty: 'beginner' },
    result: {
      content: 'Generated lesson content...',
      quality: 92,
      wordCount: 1200,
      imageCount: 8
    },
    createdAt: new Date(Date.now() - 3600000),
    startedAt: new Date(Date.now() - 3500000),
    completedAt: new Date(Date.now() - 3000000)
  },
  {
    id: '2',
    name: 'Vocabulary Flashcard Set',
    type: 'flashcard',
    status: 'running',
    progress: 65,
    files: ['vocabulary-list.xlsx'],
    template: 'Bilingual Flashcards',
    language: 'zh',
    settings: { includeImages: true, difficulty: 'intermediate' },
    createdAt: new Date(Date.now() - 1800000),
    startedAt: new Date(Date.now() - 1700000)
  },
  {
    id: '3',
    name: 'Grammar Worksheets',
    type: 'worksheet',
    status: 'pending',
    progress: 0,
    files: ['grammar-rules.pdf'],
    template: 'Practice Worksheet',
    language: 'en',
    settings: { includeAnswerKey: true },
    createdAt: new Date(Date.now() - 900000)
  }
];

export function BatchGeneration({
  onBatchComplete,
  onItemComplete,
  maxConcurrent = 3,
  className
}: BatchGenerationProps) {
  const [batchItems, setBatchItems] = useState<BatchItem[]>(mockBatchItems);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentConcurrency, setCurrentConcurrency] = useState(2);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    return batchItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.template.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchesType = filterType === 'all' || item.type === filterType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [batchItems, searchTerm, filterStatus, filterType]);

  const runningCount = batchItems.filter(item => item.status === 'running').length;
  const completedCount = batchItems.filter(item => item.status === 'completed').length;
  const errorCount = batchItems.filter(item => item.status === 'error').length;

  const overallProgress = useMemo(() => {
    if (batchItems.length === 0) return 0;
    const totalProgress = batchItems.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(totalProgress / batchItems.length);
  }, [batchItems]);

  const handleStartBatch = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);

    // Start simulation of batch processing
    const interval = setInterval(() => {
      setBatchItems(prev => {
        const updated = [...prev];
        const runningItems = updated.filter(item => item.status === 'running');
        const pendingItems = updated.filter(item => item.status === 'pending');

        // Update progress for running items
        runningItems.forEach(item => {
          const index = updated.findIndex(i => i.id === item.id);
          if (index !== -1) {
            updated[index] = {
              ...item,
              progress: Math.min(item.progress + Math.random() * 15, 100),
              startedAt: item.startedAt || new Date()
            };

            // Complete items that reach 100%
            if (updated[index].progress >= 100) {
              updated[index] = {
                ...updated[index],
                status: 'completed',
                progress: 100,
                completedAt: new Date(),
                result: {
                  content: `Generated content for ${updated[index].name}`,
                  quality: Math.floor(Math.random() * 20) + 80,
                  wordCount: Math.floor(Math.random() * 1000) + 500,
                  imageCount: Math.floor(Math.random() * 10)
                }
              };
              onItemComplete?.(updated[index].id, updated[index].result);
            }
          }
        });

        // Start new items if there's capacity
        const availableSlots = currentConcurrency - runningItems.length;
        const itemsToStart = pendingItems.slice(0, availableSlots);

        itemsToStart.forEach(item => {
          const index = updated.findIndex(i => i.id === item.id);
          if (index !== -1) {
            updated[index] = {
              ...item,
              status: 'running',
              progress: Math.random() * 20,
              startedAt: new Date()
            };
          }
        });

        // Check if batch is complete
        const allCompleted = updated.every(item =>
          item.status === 'completed' || item.status === 'error'
        );

        if (allCompleted) {
          clearInterval(interval);
          setIsRunning(false);
          onBatchComplete?.('batch-1', updated.map(item => item.result).filter(Boolean));
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentConcurrency, onItemComplete, onBatchComplete]);

  const handlePauseBatch = useCallback(() => {
    setIsPaused(true);
    setIsRunning(false);

    setBatchItems(prev => prev.map(item =>
      item.status === 'running'
        ? { ...item, status: 'paused' }
        : item
    ));
  }, []);

  const handleResumeBatch = useCallback(() => {
    setIsPaused(false);
    handleStartBatch();

    setBatchItems(prev => prev.map(item =>
      item.status === 'paused'
        ? { ...item, status: 'running' }
        : item
    ));
  }, [handleStartBatch]);

  const handleStopBatch = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);

    setBatchItems(prev => prev.map(item =>
      ['running', 'paused'].includes(item.status)
        ? { ...item, status: 'pending', progress: 0 }
        : item
    ));
  }, []);

  const handleRetryItem = useCallback((itemId: string) => {
    setBatchItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, status: 'pending', progress: 0, error: undefined }
        : item
    ));
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== itemId));
    setSelectedItems(prev => prev.filter(id => id !== itemId));
  }, []);

  const handleItemSelect = useCallback((itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      if (checked) {
        return [...prev, itemId];
      } else {
        return prev.filter(id => id !== itemId);
      }
    });
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'error': return XCircle;
      case 'running': return Zap;
      case 'paused': return Pause;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'running': return 'text-blue-500';
      case 'paused': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Batch Generation Queue
              </CardTitle>
              <CardDescription>
                Process multiple content generation tasks in parallel
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={isRunning ? "default" : "secondary"}>
                {isRunning ? 'Running' : isPaused ? 'Paused' : 'Idle'}
              </Badge>
              <Badge variant="outline">
                {runningCount}/{currentConcurrency} Active
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedCount} completed</span>
                <span>{errorCount} errors</span>
                <span>{batchItems.length - completedCount - errorCount} remaining</span>
              </div>
            </div>

            {/* Batch Controls */}
            <div className="flex items-center gap-4">
              {!isRunning && !isPaused && (
                <Button onClick={handleStartBatch} disabled={batchItems.length === 0}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Batch
                </Button>
              )}

              {isRunning && (
                <Button onClick={handlePauseBatch} variant="outline">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}

              {isPaused && (
                <Button onClick={handleResumeBatch}>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}

              {(isRunning || isPaused) && (
                <Button onClick={handleStopBatch} variant="destructive">
                  <XCircle className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}

              <div className="flex items-center gap-2">
                <Label>Concurrency:</Label>
                <Select
                  value={currentConcurrency.toString()}
                  onValueChange={(value) => setCurrentConcurrency(parseInt(value))}
                  disabled={isRunning}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search batch items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="lesson_plan">Lesson Plans</SelectItem>
                <SelectItem value="flashcard">Flashcards</SelectItem>
                <SelectItem value="worksheet">Worksheets</SelectItem>
                <SelectItem value="activity">Activities</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Batch Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Queue Items ({filteredItems.length})</CardTitle>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedItems.length} selected</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItems([])}
                >
                  Clear selection
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const StatusIcon = getStatusIcon(item.status);
                const isSelected = selectedItems.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "border rounded-lg p-4",
                      isSelected && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked: any) => handleItemSelect(item.id, checked)}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={cn("w-4 h-4", getStatusColor(item.status))} />
                            <h4 className="font-medium truncate">{item.name}</h4>
                            <Badge variant="outline">{item.type.replace('_', ' ')}</Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.status === 'error' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetryItem(item.id)}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Retry
                              </Button>
                            )}

                            {item.status === 'completed' && (
                              <Button variant="outline" size="sm">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mb-3">
                          <div>Template: {item.template}</div>
                          <div>Language: {item.language.toUpperCase()}</div>
                          <div>Files: {item.files.length}</div>
                          <div>Created: {item.createdAt.toLocaleDateString()}</div>
                        </div>

                        {/* Progress */}
                        {(item.status === 'running' || item.status === 'completed') && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{Math.round(item.progress)}%</span>
                            </div>
                            <Progress value={item.progress} className="h-2" />
                          </div>
                        )}

                        {/* Error Message */}
                        {item.status === 'error' && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>{item.error || 'Generation failed'}</AlertDescription>
                          </Alert>
                        )}

                        {/* Result Summary */}
                        {item.status === 'completed' && item.result && (
                          <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>{item.result.wordCount} words</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              <span>{item.result.imageCount} images</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span>{item.result.quality}% quality</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No batch items found</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Batch Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-500">{batchItems.length}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-500">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-red-500">{errorCount}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-500">
                {batchItems
                  .filter(item => item.result)
                  .reduce((sum, item) => sum + (item.result?.quality || 0), 0) /
                Math.max(completedCount, 1)
                }%
              </div>
              <div className="text-sm text-muted-foreground">Avg Quality</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}