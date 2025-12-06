import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  Search,
  FileImage
} from "lucide-react";
import { cn } from "@/lib/utils";
// Define the type locally to avoid import issues
interface Template {
  id: string;
  projectId: string;
  filename: string;
  originalName: string;
  fileType: 'md' | 'docx';
  fileSize: number;
  mimeType: string;
  content: string | null;
  structure: any;
  storageUrl: string | null;
  storageKey: string | null;
  contentHash: string | null;
  uploadedBy: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateListProps {
  projectId: string;
  className?: string;
}

interface TemplateListResponse {
  templates: Template[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function TemplateList({ projectId, className }: TemplateListProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/templates/${projectId}/templates?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      const data: TemplateListResponse = await response.json();
      setTemplates(data.templates);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [projectId, currentPage, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.statusText}`);
      }

      // Refresh the list
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handlePreview = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }

      const data = await response.json();

      // You could open a modal or navigate to a preview page
      console.log('Template preview data:', data.template);
      alert(`Template: ${data.template.originalName}\n\nContent preview:\n${data.template.content?.substring(0, 500)}...`);
    } catch (err) {
      console.error('Failed to preview template:', err);
      alert(err instanceof Error ? err.message : 'Failed to preview template');
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'md':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'docx':
        return <FileImage className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button onClick={fetchTemplates} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Templates ({pagination.total})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Button onClick={fetchTemplates} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              {search ? 'No templates found matching your search' : 'No templates uploaded yet'}
            </p>
            <p className="text-xs text-muted-foreground">
              {search ? 'Try adjusting your search terms' : 'Upload your first template to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(template.fileType)}
                        <div>
                          <p className="text-sm font-medium">{template.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {template.structure?.headings?.length || 0} sections
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.fileType === 'md' ? 'default' : 'secondary'}>
                        {template.fileType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(template.fileSize)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(template.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(template.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          {template.storageUrl && (
                            <DropdownMenuItem asChild>
                              <a
                                href={template.storageUrl}
                                download={template.originalName}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(template.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {pagination.pages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={cn(
                          currentPage <= 1 && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>

                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    {pagination.pages > 5 && (
                      <PaginationItem>
                        <span className="px-2">...</span>
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(Math.min(pagination.pages, currentPage + 1))}
                        className={cn(
                          currentPage >= pagination.pages && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}