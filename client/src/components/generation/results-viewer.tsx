import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Eye,
  Edit3,
  Save,
  RotateCcw,
  Download,
  Share2,
  Check,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Layers,
  Settings,
  Search,
  Filter,
  Copy,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratedContent {
  id: string;
  type: 'lesson_plan' | 'flashcard' | 'worksheet' | 'activity' | 'assessment';
  title: string;
  content: string;
  originalContent: string;
  template: string;
  metadata: {
    wordCount: number;
    pageCount?: number;
    sectionCount: number;
    imageCount: number;
    generatedAt: Date;
    qualityScore: number;
    language: string;
    tags: string[];
  };
  images?: Array<{
    id: string;
    url: string;
    alt: string;
    description: string;
    position: number;
  }>;
  sections?: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
  }>;
  status: 'generated' | 'reviewed' | 'edited' | 'approved' | 'rejected';
  feedback?: string;
  changes?: {
    type: 'content' | 'structure' | 'formatting';
    description: string;
    timestamp: Date;
  }[];
}

interface ResultsViewerProps {
  contents: GeneratedContent[];
  onContentUpdate?: (contentId: string, updates: Partial<GeneratedContent>) => void;
  onContentApprove?: (contentId: string) => void;
  onContentReject?: (contentId: string, reason: string) => void;
  onExport?: (contentIds: string[]) => void;
  showCompare?: boolean;
  allowEditing?: boolean;
  className?: string;
}

const mockGeneratedContent: GeneratedContent[] = [
  {
    id: '1',
    type: 'lesson_plan',
    title: 'Chinese Numbers 1-10 Lesson',
    content: `## Chinese Numbers 1-10 Lesson Plan

### Learning Objectives
- Students will learn to count from 1 to 10 in Chinese
- Students will recognize Chinese number characters
- Students will practice pronunciation

### Materials Needed
- Number flashcards
- Whiteboard and markers
- Practice worksheets

### Lesson Activities

#### Warm-up (5 minutes)
- Review previous numbers learned
- Introduce today's topic

#### Main Activity (25 minutes)
- Teach numbers 1-10 with visual aids
- Practice pronunciation together
- Interactive counting games

#### Practice (15 minutes)
- Individual practice with worksheets
- Pair work activities
- Number recognition games

#### Assessment (5 minutes)
- Quick oral assessment
- Written practice

### Homework
- Practice writing numbers 1-10
- Review with family members`,

    originalContent: `## Chinese Numbers 1-10 Lesson Plan

### Learning Objectives
{{learningObjectives}}

### Materials Needed
{{materials}}

### Lesson Activities
{{activities}}

### Assessment
{{assessment}}`,

    template: 'Interactive Lesson Plan',
    metadata: {
      wordCount: 150,
      pageCount: 2,
      sectionCount: 5,
      imageCount: 3,
      generatedAt: new Date(),
      qualityScore: 85,
      language: 'zh',
      tags: ['numbers', 'beginner', 'counting']
    },
    sections: [
      { id: '1', title: 'Learning Objectives', content: 'Students will learn to count from 1 to 10 in Chinese...', order: 1 },
      { id: '2', title: 'Materials Needed', content: 'Number flashcards, Whiteboard and markers...', order: 2 },
      { id: '3', title: 'Lesson Activities', content: 'Warm-up, Main Activity, Practice, Assessment...', order: 3 }
    ],
    status: 'generated'
  },
  {
    id: '2',
    type: 'flashcard',
    title: 'Basic Greetings Flashcards',
    content: `# Chinese Greetings Flashcards

## Front Side - Chinese
你好 (nǐ hǎo)
- Hello

## Front Side - Chinese
早上好 (zǎo shàng hǎo)
- Good morning

## Front Side - Chinese
谢谢 (xiè xiè)
- Thank you

## Front Side - Chinese
不客气 (bù kè qi)
- You're welcome`,

    originalContent: `{{#each wordList}}
### {{this.word}}
- **Pinyin**: {{this.pinyin}}
- **Translation**: {{this.translation}}
{{/each}}`,

    template: 'Vocabulary Flashcard Set',
    metadata: {
      wordCount: 80,
      pageCount: 1,
      sectionCount: 4,
      imageCount: 4,
      generatedAt: new Date(),
      qualityScore: 92,
      language: 'zh',
      tags: ['greetings', 'daily-use', 'beginner']
    },
    images: [
      { id: '1', url: '/images/hello-icon.svg', alt: 'Hello gesture', description: 'Person waving hello', position: 0 },
      { id: '2', url: '/images/morning-icon.svg', alt: 'Morning sun', description: 'Sunrise illustration', position: 1 }
    ],
    status: 'reviewed'
  }
];

export function ResultsViewer({
  contents = mockGeneratedContent,
  onContentUpdate,
  onContentApprove,
  onContentReject,
  onExport,
  showCompare = true,
  allowEditing = true,
  className
}: ResultsViewerProps) {
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(contents[0] || null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedContents, setSelectedContents] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [feedbackText, setFeedbackText] = useState('');

  const filteredContents = useMemo(() => {
    return contents.filter(content => {
      const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           content.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || content.type === filterType;
      const matchesStatus = filterStatus === 'all' || content.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contents, searchTerm, filterType, filterStatus]);

  const handleContentEdit = useCallback((content: GeneratedContent) => {
    setSelectedContent(content);
    setEditedContent(content.content);
    setEditMode(true);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (selectedContent && editedContent) {
      const updatedContent = {
        ...selectedContent,
        content: editedContent,
        originalContent: selectedContent.originalContent,
        status: 'edited' as const,
        changes: [
          ...(selectedContent.changes || []),
          {
            type: 'content' as const,
            description: 'Content updated via editor',
            timestamp: new Date()
          }
        ]
      };

      onContentUpdate?.(selectedContent.id, updatedContent);
      setSelectedContent(updatedContent);
      setEditMode(false);
    }
  }, [selectedContent, editedContent, onContentUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    setEditedContent('');
  }, []);

  const handleContentSelect = useCallback((content: GeneratedContent) => {
    setSelectedContent(content);
    setEditMode(false);
    setFeedbackText('');
  }, []);

  const handleContentApproval = useCallback((contentId: string) => {
    onContentApprove?.(contentId);
    if (selectedContent?.id === contentId) {
      setSelectedContent(prev => prev ? { ...prev, status: 'approved' } : null);
    }
  }, [selectedContent, onContentApprove]);

  const handleContentRejection = useCallback((contentId: string, reason: string) => {
    onContentReject?.(contentId, reason);
    if (selectedContent?.id === contentId) {
      setSelectedContent(prev => prev ? { ...prev, status: 'rejected', feedback: reason } : null);
    }
    setFeedbackText('');
  }, [selectedContent, onContentReject]);

  const toggleSectionExpansion = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const toggleContentSelection = useCallback((contentId: string) => {
    setSelectedContents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.add(contentId);
      }
      return Array.from(newSet);
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'edited': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lesson_plan': return FileText;
      case 'flashcard': return Layers;
      case 'worksheet': return FileText;
      case 'activity': return Settings;
      case 'assessment': return FileText;
      default: return FileText;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Review Generated Content
              </CardTitle>
              <CardDescription>
                Review, edit, and approve generated content before export
              </CardDescription>
            </div>

            {selectedContents.length > 0 && (
              <Button onClick={() => onExport?.(selectedContents)}>
                <Download className="w-4 h-4 mr-2" />
                Export Selected ({selectedContents.length})
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="lesson_plan">Lesson Plans</SelectItem>
                <SelectItem value="flashcard">Flashcards</SelectItem>
                <SelectItem value="worksheet">Worksheets</SelectItem>
                <SelectItem value="activity">Activities</SelectItem>
                <SelectItem value="assessment">Assessments</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="edited">Edited</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Generated Content ({filteredContents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredContents.map((content) => {
                  const TypeIcon = getTypeIcon(content.type);
                  const isSelected = selectedContent?.id === content.id;
                  const isMultiSelected = selectedContents.includes(content.id);

                  return (
                    <div
                      key={content.id}
                      className={cn(
                        "border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md",
                        isSelected && "ring-2 ring-primary",
                        isMultiSelected && "ring-2 ring-blue-500"
                      )}
                      onClick={() => handleContentSelect(content)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isMultiSelected}
                          onCheckedChange={() => toggleContentSelection(content.id)}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <TypeIcon className="w-5 h-5 mt-1 text-muted-foreground flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{content.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {content.type.replace('_', ' ')} • {content.metadata.wordCount} words
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(content.status)}>
                              {content.status}
                            </Badge>
                            <Badge variant="outline">
                              Score: {content.metadata.qualityScore}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-2">
                            {content.metadata.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Content Viewer */}
        <Card className="lg:col-span-2">
          {selectedContent ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getTypeIcon(selectedContent.type)}
                      {selectedContent.title}
                    </CardTitle>
                    <CardDescription>
                      Generated {selectedContent.metadata.generatedAt.toLocaleDateString()}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(selectedContent.status)}>
                      {selectedContent.status}
                    </Badge>

                    {allowEditing && !editMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContentEdit(selectedContent)}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="content" className="w-full">
                  <TabsList>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    {showCompare && <TabsTrigger value="compare">Compare</TabsTrigger>}
                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                    <TabsTrigger value="images">Images</TabsTrigger>
                    <TabsTrigger value="review">Review</TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-4">
                    {editMode ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label>Edit Content</Label>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancelEdit}>
                              Cancel
                            </Button>
                            <Button onClick={handleSaveEdit}>
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-[400px] font-mono"
                        />
                      </div>
                    ) : (
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                          {selectedContent.content}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {showCompare && (
                    <TabsContent value="compare" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Template</h4>
                          <div className="bg-muted/30 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">
                            {selectedContent.originalContent}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Generated</h4>
                          <div className="bg-green-50 p-4 rounded-lg text-sm">
                            {selectedContent.content}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="metadata" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Content Type</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedContent.type.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <Label>Template</Label>
                        <p className="text-sm text-muted-foreground">{selectedContent.template}</p>
                      </div>
                      <div>
                        <Label>Word Count</Label>
                        <p className="text-sm text-muted-foreground">{selectedContent.metadata.wordCount}</p>
                      </div>
                      <div>
                        <Label>Quality Score</Label>
                        <p className="text-sm text-muted-foreground">{selectedContent.metadata.qualityScore}%</p>
                      </div>
                      <div>
                        <Label>Language</Label>
                        <p className="text-sm text-muted-foreground">{selectedContent.metadata.language.toUpperCase()}</p>
                      </div>
                      <div>
                        <Label>Generated At</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedContent.metadata.generatedAt.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedContent.metadata.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="images" className="space-y-4">
                    {selectedContent.images && selectedContent.images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {selectedContent.images.map(image => (
                          <div key={image.id} className="border rounded-lg p-3">
                            <img
                              src={image.url}
                              alt={image.alt}
                              className="w-full h-32 object-cover rounded mb-2"
                            />
                            <h5 className="font-medium">{image.alt}</h5>
                            <p className="text-sm text-muted-foreground">{image.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <ImageIcon className="w-4 h-4" />
                        <AlertDescription>
                          No images were generated for this content.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="review" className="space-y-4">
                    {selectedContent.status !== 'approved' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            onClick={() => handleContentApproval(selectedContent.id)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (feedbackText.trim()) {
                                handleContentRejection(selectedContent.id, feedbackText);
                              }
                            }}
                            disabled={!feedbackText.trim()}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>

                        <div>
                          <Label htmlFor="feedback">Feedback (required for rejection)</Label>
                          <Textarea
                            id="feedback"
                            placeholder="Provide feedback for rejection or improvement suggestions..."
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}

                    {selectedContent.feedback && (
                      <Alert>
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          <strong>Feedback:</strong> {selectedContent.feedback}
                        </AlertDescription>
                      </Alert>
                    )}

                    {selectedContent.changes && selectedContent.changes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Change History</h4>
                        <div className="space-y-2">
                          {selectedContent.changes.map((change, index) => (
                            <div key={index} className="text-sm border-l-2 border-blue-200 pl-3">
                              <div className="font-medium">{change.type}</div>
                              <div className="text-muted-foreground">{change.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {change.timestamp.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-96">
              <div className="text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a content item to review</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}