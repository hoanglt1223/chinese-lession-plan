import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CloudUpload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  FileImage
} from "lucide-react";
import { cn } from "@/lib/utils";
// Define the type locally to avoid import issues
interface TemplateUploadResponse {
  success: boolean;
  templates?: Array<{
    id: string;
    filename: string;
    originalName: string;
    fileType: string;
    status: 'uploaded' | 'error';
    error?: string;
  }>;
  duplicates?: Array<{
    filename: string;
    originalName: string;
    existingId: string;
  }>;
  errors?: string[];
}

interface TemplateFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress: number;
}

interface TemplateUploadProps {
  projectId: string;
  onUploadComplete?: (response: TemplateUploadResponse) => void;
  className?: string;
}

export function TemplateUpload({
  projectId,
  onUploadComplete,
  className
}: TemplateUploadProps) {
  const [files, setFiles] = useState<TemplateFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<TemplateUploadResponse | null>(null);

  const handleFileChange = useCallback((newFiles: File[]) => {
    const templateFiles: TemplateFile[] = newFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => {
      const updated = [...prev, ...templateFiles];
      // Limit to 10 files max
      return updated.slice(-10);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return ['md', 'docx'].includes(extension || '') && file.size <= 10 * 1024 * 1024;
    });

    handleFileChange(droppedFiles);
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileChange(selectedFiles);
  }, [handleFileChange]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();

      // Add files to form data
      files.forEach((templateFile, index) => {
        formData.append(`file${index}`, templateFile.file);
      });

      // Add project ID
      formData.append('projectId', projectId);

      // Update file statuses to uploading
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'uploading' as const,
        progress: 0
      })));

      const response = await fetch(`/api/templates/${projectId}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: files.map(tf => ({
            name: tf.file.name,
            type: tf.file.type,
            size: tf.file.size
          })),
          projectId
        })
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result: TemplateUploadResponse = await response.json();
      setUploadResult(result);

      // Update file statuses based on result
      setFiles(prev => prev.map(tf => {
        const templateResult = result.templates?.find(t => t.originalName === tf.file.name);
        if (templateResult) {
          return {
            ...tf,
            status: templateResult.status === 'uploaded' ? 'success' : 'error',
            error: templateResult.error,
            progress: 100
          };
        }

        const duplicateResult = result.duplicates?.find(d => d.originalName === tf.file.name);
        if (duplicateResult) {
          return {
            ...tf,
            status: 'error',
            error: 'Duplicate file detected',
            progress: 100
          };
        }

        return {
          ...tf,
          status: 'error',
          error: 'Unknown error',
          progress: 100
        };
      }));

      onUploadComplete?.(result);

    } catch (error) {
      console.error('Upload failed:', error);
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Upload failed',
        progress: 0
      })));
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'md':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'docx':
        return <FileImage className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: TemplateFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const clearAll = () => {
    setFiles([]);
    setUploadResult(null);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5" />
            Upload Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              "hover:border-primary hover:bg-primary/5"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <CloudUpload className="text-muted-foreground text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium">Upload template files</p>
                <p className="text-xs text-muted-foreground">
                  Support for .md and .docx files (max 10MB each, 10 files total)
                </p>
              </div>
              <Button asChild variant="outline">
                <label className="cursor-pointer">
                  Choose Files
                  <input
                    type="file"
                    accept=".md,.docx"
                    multiple
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Files ({files.length}/10)</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={uploadFiles}
                    disabled={isUploading || files.every(f => f.status !== 'pending')}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Files'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearAll}>
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {files.map((templateFile, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    {getFileIcon(templateFile.file.name)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {templateFile.file.name}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {(templateFile.file.size / 1024).toFixed(0)} KB
                        </Badge>
                        <Badge
                          variant={templateFile.file.name.endsWith('.md') ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {templateFile.file.name.split('.').pop()?.toUpperCase()}
                        </Badge>
                      </div>
                      {templateFile.status === 'uploading' && (
                        <Progress value={templateFile.progress} className="mt-2 h-1" />
                      )}
                      {templateFile.error && (
                        <p className="text-xs text-red-500 mt-1">{templateFile.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(templateFile.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadResult && (
            <div className="space-y-3">
              <Alert className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {uploadResult.success
                    ? `Successfully uploaded ${uploadResult.templates?.filter(t => t.status === 'uploaded').length || 0} templates`
                    : 'Upload completed with errors'
                  }
                </AlertDescription>
              </Alert>

              {uploadResult.duplicates && uploadResult.duplicates.length > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {uploadResult.duplicates.length} duplicate file(s) detected and skipped
                  </AlertDescription>
                </Alert>
              )}

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>Errors encountered:</p>
                      {uploadResult.errors.map((error, index) => (
                        <p key={index} className="text-sm">• {error}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}