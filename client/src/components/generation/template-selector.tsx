import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Layers,
  FileText,
  BookOpen,
  Zap,
  Users,
  Star,
  Search,
  Filter,
  Eye,
  Check,
  X,
  TrendingUp,
  Clock,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required: boolean;
  defaultValue?: any;
}

interface Template {
  id: string;
  name: string;
  type: 'lesson_plan' | 'flashcard' | 'worksheet' | 'activity' | 'assessment';
  description: string;
  category: string;
  language: string;
  ageGroup: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  variables: TemplateVariable[];
  content: string;
  preview?: string;
  usageCount: number;
  rating: number;
  tags: string[];
  isPremium: boolean;
  featured: boolean;
  createdAt: string;
  metadata?: {
    complexity: 'simple' | 'medium' | 'complex';
    hasTables: boolean;
    hasMultimedia: boolean;
    customizableSections: number;
  };
}

interface TemplateSelectorProps {
  onTemplateSelect?: (templates: Template[]) => void;
  selectedTemplates?: Template[];
  maxSelection?: number;
  showComparison?: boolean;
  className?: string;
  disabled?: boolean;
}

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Interactive Lesson Plan',
    type: 'lesson_plan',
    description: 'Comprehensive lesson plan with interactive activities and assessments',
    category: 'Education',
    language: 'zh',
    ageGroup: 'primary',
    difficulty: 'intermediate',
    estimatedTime: '45-60 min',
    variables: [
      { name: 'lessonTitle', type: 'string', description: 'Main lesson title', required: true },
      { name: 'learningObjectives', type: 'array', description: 'List of learning objectives', required: true },
      { name: 'materials', type: 'array', description: 'Required materials', required: false },
      { name: 'activities', type: 'array', description: 'Class activities', required: true },
      { name: 'assessment', type: 'string', description: 'Assessment method', required: true }
    ],
    content: '## {{lessonTitle}}\n\n### Learning Objectives\n{{learningObjectives}}\n\n### Materials\n{{materials}}\n\n### Activities\n{{activities}}',
    preview: 'Interactive lesson plan with multiple sections...',
    usageCount: 1250,
    rating: 4.8,
    tags: ['interactive', 'assessment', 'activities'],
    isPremium: false,
    featured: true,
    createdAt: '2024-01-15',
    metadata: {
      complexity: 'medium',
      hasTables: true,
      hasMultimedia: true,
      customizableSections: 5
    }
  },
  {
    id: '2',
    name: 'Vocabulary Flashcard Set',
    type: 'flashcard',
    description: 'Bilingual flashcard template with image support',
    category: 'Language Learning',
    language: 'zh',
    ageGroup: 'preschool',
    difficulty: 'beginner',
    estimatedTime: '15-20 min',
    variables: [
      { name: 'wordList', type: 'array', description: 'List of vocabulary words', required: true },
      { name: 'includeImages', type: 'boolean', description: 'Include visual aids', required: false, defaultValue: true },
      { name: 'difficultyLevel', type: 'string', description: 'Complexity level', required: false, defaultValue: 'beginner' }
    ],
    content: '{{#each wordList}}\n### {{this.word}}\n- **Pinyin**: {{this.pinyin}}\n- **Translation**: {{this.translation}}\n- **Image**: {{#if ../includeImages}}{{this.image}}{{/if}}\n{{/each}}',
    preview: 'Bilingual vocabulary flashcards with visual aids...',
    usageCount: 2100,
    rating: 4.9,
    tags: ['vocabulary', 'bilingual', 'visual'],
    isPremium: false,
    featured: true,
    createdAt: '2024-01-10',
    metadata: {
      complexity: 'simple',
      hasTables: false,
      hasMultimedia: true,
      customizableSections: 3
    }
  },
  {
    id: '3',
    name: 'Comprehensive Worksheet',
    type: 'worksheet',
    description: 'Multi-section worksheet with exercises and answer key',
    category: 'Education',
    language: 'zh',
    ageGroup: 'lower-secondary',
    difficulty: 'intermediate',
    estimatedTime: '30-45 min',
    variables: [
      { name: 'topic', type: 'string', description: 'Worksheet topic', required: true },
      { name: 'exercises', type: 'array', description: 'List of exercises', required: true },
      { name: 'includeAnswerKey', type: 'boolean', description: 'Include answer key', required: false, defaultValue: true }
    ],
    content: '## {{topic}} Worksheet\n\n{{#each exercises}}\n### Exercise {{@index}}\n{{this.question}}\n{{/each}}',
    preview: 'Comprehensive worksheet with multiple exercise types...',
    usageCount: 890,
    rating: 4.6,
    tags: ['exercises', 'comprehensive', 'assessment'],
    isPremium: true,
    featured: false,
    createdAt: '2024-01-20',
    metadata: {
      complexity: 'medium',
      hasTables: false,
      hasMultimedia: false,
      customizableSections: 4
    }
  }
];

export function TemplateSelector({
  onTemplateSelect,
  selectedTemplates = [],
  maxSelection = 1,
  showComparison = true,
  className,
  disabled = false
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'usage' | 'name' | 'newest'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [comparisonTemplates, setComparisonTemplates] = useState<Template[]>([]);

  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = selectedType === 'all' || template.type === selectedType;
      const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
      const matchesLanguage = selectedLanguage === 'all' || template.language === selectedLanguage;

      return matchesSearch && matchesType && matchesDifficulty && matchesLanguage;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [templates, searchTerm, selectedType, selectedDifficulty, selectedLanguage, sortBy]);

  const handleTemplateSelect = useCallback((template: Template) => {
    if (disabled) return;

    if (maxSelection === 1) {
      // Single selection mode
      const newSelection = selectedTemplates[0]?.id === template.id ? [] : [template];
      onTemplateSelect?.(newSelection);
    } else {
      // Multiple selection mode
      const isSelected = selectedTemplates.some(t => t.id === template.id);
      let newSelection: Template[];

      if (isSelected) {
        newSelection = selectedTemplates.filter(t => t.id !== template.id);
      } else if (selectedTemplates.length < maxSelection) {
        newSelection = [...selectedTemplates, template];
      } else {
        // Replace the first selected item
        newSelection = [...selectedTemplates.slice(1), template];
      }

      onTemplateSelect?.(newSelection);
    }
  }, [selectedTemplates, maxSelection, onTemplateSelect, disabled]);

  const toggleComparison = useCallback((template: Template) => {
    setComparisonTemplates(prev => {
      const isInComparison = prev.some(t => t.id === template.id);
      if (isInComparison) {
        return prev.filter(t => t.id !== template.id);
      } else if (prev.length < 3) {
        return [...prev, template];
      } else {
        return [...prev.slice(1), template]; // Replace the first item
      }
    });
  }, []);

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'lesson_plan': return BookOpen;
      case 'flashcard': return Layers;
      case 'worksheet': return FileText;
      case 'activity': return Zap;
      case 'assessment': return Target;
      default: return FileText;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'complex': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Select Generation Template
          </CardTitle>
          <CardDescription>
            Choose from our library of professionally designed templates
            {maxSelection > 1 && ` (select up to ${maxSelection} templates for comparison)`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
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

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="vi">Vietnamese</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="usage">Most Popular</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Label>View:</Label>
              <RadioGroup value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="flex-row">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="grid" id="grid" />
                  <Label htmlFor="grid">Grid</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="list" id="list" />
                  <Label htmlFor="list">List</Label>
                </div>
              </RadioGroup>
            </div>

            {showComparison && (
              <div className="flex items-center gap-2">
                <Label>Compare:</Label>
                <Badge variant="outline">
                  {comparisonTemplates.length}/3 selected
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid/List */}
      <div className={cn(
        viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"
      )}>
        {filteredAndSortedTemplates.map((template) => {
          const isSelected = selectedTemplates.some(t => t.id === template.id);
          const isInComparison = comparisonTemplates.some(t => t.id === template.id);
          const Icon = getTemplateIcon(template.type);

          return (
            <Card
              key={template.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && "ring-2 ring-primary",
                isInComparison && "ring-2 ring-blue-500"
              )}
              onClick={() => handleTemplateSelect(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {template.featured && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                    {template.isPremium && <Badge variant="secondary">Premium</Badge>}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{template.type.replace('_', ' ')}</Badge>
                  <Badge variant="outline">{template.difficulty}</Badge>
                  <Badge variant="outline">{template.language.toUpperCase()}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>

                {/* Template Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    <span>{template.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{template.usageCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{template.estimatedTime}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Selection Indicators */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Badge variant="default" className="bg-green-500">
                        <Check className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                    {isInComparison && (
                      <Badge variant="default" className="bg-blue-500">
                        <Eye className="w-3 h-3 mr-1" />
                        Comparing
                      </Badge>
                    )}
                  </div>

                  {showComparison && maxSelection === 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleComparison(template);
                      }}
                    >
                      {isInComparison ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Template Comparison */}
      {showComparison && comparisonTemplates.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Template Comparison ({comparisonTemplates.length})
            </CardTitle>
            <CardDescription>
              Compare selected templates side by side to make the best choice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Feature</th>
                    {comparisonTemplates.map(template => (
                      <th key={template.id} className="text-left p-4 font-medium">
                        <div className="space-y-1">
                          <span>{template.name}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">{template.difficulty}</Badge>
                            {template.isPremium && <Badge variant="secondary">Premium</Badge>}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Type</td>
                    {comparisonTemplates.map(template => (
                      <td key={template.id} className="p-4">
                        {template.type.replace('_', ' ')}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Variables</td>
                    {comparisonTemplates.map(template => (
                      <td key={template.id} className="p-4">
                        <div className="space-y-1">
                          <span>{template.variables.length} variables</span>
                          <div className="text-sm text-muted-foreground">
                            {template.variables.filter(v => v.required).length} required
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Complexity</td>
                    {comparisonTemplates.map(template => (
                      <td key={template.id} className="p-4">
                        <Badge className={getComplexityColor(template.metadata?.complexity || 'medium')}>
                          {template.metadata?.complexity || 'medium'}
                        </Badge>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Features</td>
                    {comparisonTemplates.map(template => (
                      <td key={template.id} className="p-4">
                        <div className="space-y-1">
                          {template.metadata?.hasTables && <Badge variant="outline">Tables</Badge>}
                          {template.metadata?.hasMultimedia && <Badge variant="outline">Multimedia</Badge>}
                          <Badge variant="outline">{template.metadata?.customizableSections} sections</Badge>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Rating</td>
                    {comparisonTemplates.map(template => (
                      <td key={template.id} className="p-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span>{template.rating}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Usage</td>
                    {comparisonTemplates.map(template => (
                      <td key={template.id} className="p-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{template.usageCount.toLocaleString()}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredAndSortedTemplates.length === 0 && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            No templates found matching your criteria. Try adjusting your filters or search terms.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}