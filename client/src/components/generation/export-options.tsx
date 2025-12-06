import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  Code,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
  Settings,
  Check,
  X,
  AlertCircle,
  Info,
  Zap,
  Eye,
  Share2,
  Mail,
  MessageSquare,
  Printer,
  Database,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fileExtension: string;
  mimeType: string;
  category: 'document' | 'image' | 'web' | 'data' | 'print';
  features: string[];
  limitations?: string[];
  premium?: boolean;
  size?: string;
  quality?: 'low' | 'medium' | 'high';
}

interface ExportOptions {
  formats: string[];
  filename: string;
  quality: 'low' | 'medium' | 'high';
  includeImages: boolean;
  includeMetadata: boolean;
  compression: boolean;
  pageSize: string;
  orientation: 'portrait' | 'landscape';
  margins: string;
  watermark?: string;
  password?: string;
  delivery: 'download' | 'email' | 'cloud' | 'api';
  recipients?: string[];
  cloudProvider?: 'google-drive' | 'dropbox' | 'onedrive';
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  content: string;
  wordCount: number;
  imageCount: number;
}

interface ExportOptionsProps {
  content: ContentItem[];
  selectedItems: string[];
  onExport?: (options: ExportOptions) => void;
  availableFormats?: ExportFormat[];
  showAdvanced?: boolean;
  defaultFilename?: string;
  className?: string;
}

const exportFormats: ExportFormat[] = [
  // Document Formats
  {
    id: 'pdf',
    name: 'PDF Document',
    description: 'Standard document format with preserved formatting',
    icon: FileText,
    fileExtension: '.pdf',
    mimeType: 'application/pdf',
    category: 'document',
    features: ['Print-ready', 'Preserves formatting', 'Password protection', 'Annotations'],
    quality: 'high'
  },
  {
    id: 'docx',
    name: 'Microsoft Word',
    description: 'Editable document format for Microsoft Word',
    icon: FileText,
    fileExtension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    category: 'document',
    features: ['Fully editable', 'Track changes', 'Collaboration', 'Templates']
  },
  {
    id: 'markdown',
    name: 'Markdown',
    description: 'Plain text with formatting syntax',
    icon: Code,
    fileExtension: '.md',
    mimeType: 'text/markdown',
    category: 'document',
    features: ['Version control', 'Lightweight', 'Universal', 'Easy editing']
  },

  // Image Formats
  {
    id: 'png',
    name: 'PNG Image',
    description: 'High-quality image format with transparency',
    icon: FileImage,
    fileExtension: '.png',
    mimeType: 'image/png',
    category: 'image',
    features: ['Lossless compression', 'Transparency', 'High quality'],
    quality: 'high'
  },
  {
    id: 'jpg',
    name: 'JPEG Image',
    description: 'Compressed image format for photos',
    icon: FileImage,
    fileExtension: '.jpg',
    mimeType: 'image/jpeg',
    category: 'image',
    features: ['Small file size', 'Good for photos', 'Universal support'],
    quality: 'medium'
  },

  // Web Formats
  {
    id: 'html',
    name: 'HTML Page',
    description: 'Interactive web page format',
    icon: Globe,
    fileExtension: '.html',
    mimeType: 'text/html',
    category: 'web',
    features: ['Interactive', 'Responsive', 'SEO-friendly', 'Accessible']
  },
  {
    id: 'epub',
    name: 'EPUB eBook',
    description: 'Digital book format for e-readers',
    icon: Tablet,
    fileExtension: '.epub',
    mimeType: 'application/epub+zip',
    category: 'web',
    features: ['Reflowable content', 'E-reader compatible', 'Accessible'],
    premium: true
  },

  // Data Formats
  {
    id: 'xlsx',
    name: 'Excel Spreadsheet',
    description: 'Structured data in tabular format',
    icon: FileSpreadsheet,
    fileExtension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    category: 'data',
    features: ['Data analysis', 'Formulas', 'Charts', 'Filtering']
  },
  {
    id: 'json',
    name: 'JSON Data',
    description: 'Structured data format for developers',
    icon: Code,
    fileExtension: '.json',
    mimeType: 'application/json',
    category: 'data',
    features: ['Machine-readable', 'API integration', 'Structured data']
  },
  {
    id: 'csv',
    name: 'CSV Data',
    description: 'Comma-separated values for data import',
    icon: FileSpreadsheet,
    fileExtension: '.csv',
    mimeType: 'text/csv',
    category: 'data',
    features: ['Universal data format', 'Excel compatible', 'Lightweight']
  }
];

const pageSizes = [
  { value: 'a4', label: 'A4 (210 × 297 mm)', description: 'Standard international size' },
  { value: 'letter', label: 'Letter (8.5 × 11 in)', description: 'US standard size' },
  { value: 'legal', label: 'Legal (8.5 × 14 in)', description: 'US legal size' },
  { value: 'a3', label: 'A3 (297 × 420 mm)', description: 'Large format' }
];

const qualityOptions = [
  { value: 'low', label: 'Low (Fast)', description: 'Smaller file size, basic quality' },
  { value: 'medium', label: 'Medium (Balanced)', description: 'Good balance of size and quality' },
  { value: 'high', label: 'High (Best)', description: 'Best quality, larger file size' }
];

export function ExportOptions({
  content,
  selectedItems,
  onExport,
  availableFormats = exportFormats,
  showAdvanced = true,
  defaultFilename = 'generated-content',
  className
}: ExportOptionsProps) {
  const [options, setOptions] = useState<ExportOptions>({
    formats: ['pdf'],
    filename: defaultFilename,
    quality: 'medium',
    includeImages: true,
    includeMetadata: true,
    compression: false,
    pageSize: 'a4',
    orientation: 'portrait',
    margins: 'normal',
    delivery: 'download'
  });

  const [selectedContent, setSelectedContent] = useState<string[]>(selectedItems);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const totalWordCount = useMemo(() => {
    return content
      .filter(item => selectedContent.includes(item.id))
      .reduce((total, item) => total + item.wordCount, 0);
  }, [content, selectedContent]);

  const totalImageCount = useMemo(() => {
    return content
      .filter(item => selectedContent.includes(item.id))
      .reduce((total, item) => total + item.imageCount, 0);
  }, [content, selectedContent]);

  const selectedFormatObjects = useMemo(() => {
    return availableFormats.filter(format => options.formats.includes(format.id));
  }, [availableFormats, options.formats]);

  const estimatedFileSize = useMemo(() => {
    const baseSize = totalWordCount * 0.1; // ~0.1KB per word
    const imageSize = totalImageCount * 100; // ~100KB per image
    let size = baseSize + imageSize;

    // Adjust based on quality
    const qualityMultiplier = options.quality === 'low' ? 0.5 : options.quality === 'high' ? 1.5 : 1;

    // Adjust based on formats
    const formatMultiplier = options.formats.some(f => f.includes('pdf')) ? 1.2 : 1;
    const compressionMultiplier = options.compression ? 0.7 : 1;

    size *= qualityMultiplier * formatMultiplier * compressionMultiplier;

    if (size < 1024) return `${size.toFixed(1)} KB`;
    return `${(size / 1024).toFixed(1)} MB`;
  }, [totalWordCount, totalImageCount, options.quality, options.formats, options.compression]);

  const handleFormatToggle = (formatId: string, checked: boolean) => {
    setOptions(prev => ({
      ...prev,
      formats: checked
        ? [...prev.formats, formatId]
        : prev.formats.filter(id => id !== formatId)
    }));
  };

  const handleContentToggle = (contentId: string, checked: boolean) => {
    setSelectedContent(prev => {
      const newSet = checked
        ? [...prev, contentId]
        : prev.filter(id => id !== contentId);
      return newSet;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    // Simulate export progress
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsExporting(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Call export callback
    setTimeout(() => {
      onExport?.(options);
    }, 2000);
  };

  const getFormatIcon = (formatId: string) => {
    const format = availableFormats.find(f => f.id === formatId);
    return format?.icon || FileText;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'document': return 'bg-blue-100 text-blue-800';
      case 'image': return 'bg-green-100 text-green-800';
      case 'web': return 'bg-purple-100 text-purple-800';
      case 'data': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Options
          </CardTitle>
          <CardDescription>
            Choose export formats and configure download settings for {selectedContent.length} selected item{selectedContent.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Content Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content Selection</CardTitle>
          <CardDescription>
            Choose which content items to include in the export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {content
              .filter(item => selectedItems.includes(item.id))
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <Checkbox
                    checked={selectedContent.includes(item.id)}
                    onCheckedChange={(checked: any) =>
                      handleContentToggle(item.id, checked)
                    }
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.type} • {item.wordCount} words • {item.imageCount} images
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Total:</span>
              <span>{totalWordCount.toLocaleString()} words, {totalImageCount} images</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Estimated file size:</span>
              <span className="font-medium">{estimatedFileSize}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export Formats</CardTitle>
          <CardDescription>
            Choose one or more export formats for your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Formats</TabsTrigger>
              <TabsTrigger value="document">Documents</TabsTrigger>
              <TabsTrigger value="web">Web & eBooks</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="image">Images</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableFormats.map((format) => {
                  const Icon = format.icon;
                  const isSelected = options.formats.includes(format.id);

                  return (
                    <div
                      key={format.id}
                      className={cn(
                        "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md",
                        isSelected && "ring-2 ring-primary bg-primary/5"
                      )}
                      onClick={() => handleFormatToggle(format.id, !isSelected)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleFormatToggle(format.id, !isSelected)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5" />
                            <h4 className="font-medium">{format.name}</h4>
                            {format.premium && (
                              <Badge variant="secondary" className="text-xs">Premium</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getCategoryColor(format.category)} variant="outline">
                              {format.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {format.fileExtension}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Category-specific tabs */}
            {['document', 'web', 'data', 'image'].map((category) => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableFormats
                    .filter(format => format.category === category)
                    .map((format) => {
                      const Icon = format.icon;
                      const isSelected = options.formats.includes(format.id);

                      return (
                        <div
                          key={format.id}
                          className={cn(
                            "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md",
                            isSelected && "ring-2 ring-primary bg-primary/5"
                          )}
                          onClick={() => handleFormatToggle(format.id, !isSelected)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleFormatToggle(format.id, !isSelected)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Icon className="w-5 h-5" />
                                <h4 className="font-medium">{format.name}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {format.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">Basic</TabsTrigger>
              {showAdvanced && <TabsTrigger value="advanced">Advanced</TabsTrigger>}
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Filename</Label>
                  <Input
                    value={options.filename}
                    onChange={(e) => setOptions(prev => ({ ...prev, filename: e.target.value }))}
                    placeholder="Enter filename without extension"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select
                    value={options.quality}
                    onValueChange={(value: any) => setOptions(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {qualityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-images"
                    checked={options.includeImages}
                    onCheckedChange={(checked: any) =>
                      setOptions(prev => ({ ...prev, includeImages: checked }))
                    }
                    disabled={totalImageCount === 0}
                  />
                  <Label htmlFor="include-images">Include images ({totalImageCount})</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-metadata"
                    checked={options.includeMetadata}
                    onCheckedChange={(checked: any) =>
                      setOptions(prev => ({ ...prev, includeMetadata: checked }))
                    }
                  />
                  <Label htmlFor="include-metadata">Include metadata</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="compression"
                    checked={options.compression}
                    onCheckedChange={(checked: any) =>
                      setOptions(prev => ({ ...prev, compression: checked }))
                    }
                  />
                  <Label htmlFor="compression">Compress files</Label>
                </div>
              </div>
            </TabsContent>

            {showAdvanced && (
              <TabsContent value="advanced" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Page Size</Label>
                    <Select
                      value={options.pageSize}
                      onValueChange={(value: any) => setOptions(prev => ({ ...prev, pageSize: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pageSizes.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            <div>
                              <div className="font-medium">{size.label}</div>
                              <div className="text-sm text-muted-foreground">{size.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Orientation</Label>
                    <Select
                      value={options.orientation}
                      onValueChange={(value: any) => setOptions(prev => ({ ...prev, orientation: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Watermark (optional)</Label>
                    <Input
                      value={options.watermark || ''}
                      onChange={(e) => setOptions(prev => ({ ...prev, watermark: e.target.value }))}
                      placeholder="Enter watermark text"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password Protection (optional)</Label>
                    <Input
                      type="password"
                      value={options.password || ''}
                      onChange={(e) => setOptions(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                  </div>
                </div>
              </TabsContent>
            )}

            <TabsContent value="delivery" className="space-y-4">
              <div className="space-y-3">
                <Label>Delivery Method</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: 'download', label: 'Direct Download', icon: Download, description: 'Download files to your device' },
                    { id: 'email', label: 'Email', icon: Mail, description: 'Send files via email' },
                    { id: 'cloud', label: 'Cloud Storage', icon: Database, description: 'Save to cloud storage' },
                    { id: 'api', label: 'API Access', icon: Code, description: 'Get API access to exported data' }
                  ].map((method) => {
                    const Icon = method.icon;
                    return (
                      <div
                        key={method.id}
                        className={cn(
                          "border rounded-lg p-4 cursor-pointer transition-all",
                          options.delivery === method.id ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"
                        )}
                        onClick={() => setOptions(prev => ({ ...prev, delivery: method.id as any }))}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <div>
                            <div className="font-medium">{method.label}</div>
                            <div className="text-sm text-muted-foreground">{method.description}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {options.delivery === 'email' && (
                <div className="space-y-2">
                  <Label>Email Recipients</Label>
                  <Input
                    type="email"
                    placeholder="Enter email addresses (comma-separated)"
                    value={options.recipients?.join(', ') || ''}
                    onChange={(e) =>
                      setOptions(prev => ({
                        ...prev,
                        recipients: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
                      }))
                    }
                  />
                </div>
              )}

              {options.delivery === 'cloud' && (
                <div className="space-y-2">
                  <Label>Cloud Provider</Label>
                  <Select
                    value={options.cloudProvider}
                    onValueChange={(value: any) => setOptions(prev => ({ ...prev, cloudProvider: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google-drive">Google Drive</SelectItem>
                      <SelectItem value="dropbox">Dropbox</SelectItem>
                      <SelectItem value="onedrive">OneDrive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Export Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{selectedContent.length}</div>
                <div className="text-sm text-muted-foreground">Content Items</div>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Download className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{options.formats.length}</div>
                <div className="text-sm text-muted-foreground">Export Formats</div>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{estimatedFileSize}</div>
                <div className="text-sm text-muted-foreground">Estimated Size</div>
              </div>
            </div>

            {/* Selected Formats */}
            <div>
              <Label className="text-base font-medium">Selected Formats</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedFormatObjects.map((format) => {
                  const Icon = format.icon;
                  return (
                    <Badge key={format.id} variant="outline" className="flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {format.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Export Button */}
            <div className="pt-4 border-t">
              {isExporting ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Exporting...</span>
                    <span className="text-sm">{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Please wait while we prepare your files...
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleExport}
                  disabled={selectedContent.length === 0 || options.formats.length === 0}
                  className="w-full"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Content
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}