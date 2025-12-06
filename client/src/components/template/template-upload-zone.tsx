import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'validating' | 'valid' | 'invalid';
  errors?: string[];
  variables?: string[];
  progress?: number;
}

interface TemplateUploadZoneProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  accept?: string[];
  disabled?: boolean;
  className?: string;
  extractVariables?: boolean;
}

export function TemplateUploadZone({
  onFilesChange,
  maxFiles = 10,
  maxSize = 10,
  accept = ['.md', '.txt', '.docx', '.pdf'],
  disabled = false,
  className,
  extractVariables = true
}: TemplateUploadZoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  // Extract template variables from file content
  const extractTemplateVariables = useCallback((content: string): string[] => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      variables.push(match[1].trim());
    }

    return [...new Set(variables)]; // Remove duplicates
  }, []);

  // Read file content and extract variables
  const processFile = useCallback(async (file: File): Promise<{ variables: string[]; errors: string[] }> => {
    const variables: string[] = [];
    const errors: string[] = [];

    try {
      // Read file content
      const content = await readFileContent(file);

      // Validate file type
      if (file.type === 'application/pdf' && !content) {
        errors.push('PDF files require additional processing');
        return { variables, errors };
      }

      // Extract variables if requested
      if (extractVariables && content) {
        const extracted = extractTemplateVariables(content);
        variables.push(...extracted);
      }

      // Basic validation
      if (content && content.length < 10) {
        errors.push('File content is too short');
      }

      if (content && content.length > 100000) {
        errors.push('File content is too large (>100KB)');
      }

    } catch (error) {
      errors.push(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { variables, errors };
  }, [extractVariables]);

  // Read file content based on type
  const readFileContent = async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.name.endsWith('.md')) {
      return await file.text();
    }

    if (file.type === 'application/pdf' || file.name.endsWith('.docx')) {
      // For PDF/DOCX, we'll need server-side processing
      // Return empty for now, will be processed on upload
      return '';
    }

    return '';
  };

  const handleFiles = useCallback(async (acceptedFiles: File[]) => {
    // Check max files limit
    const newTotal = uploadedFiles.length + acceptedFiles.length;
    if (newTotal > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed. You can upload ${maxFiles - uploadedFiles.length} more.`);
      return;
    }

    // Create UploadedFile objects
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'pending',
      progress: 0
    }));

    // Add to state
    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);

    // Process files asynchronously
    newFiles.forEach(async (uploadedFile, index) => {
      // Update status to validating
      const validatingFiles = [...updatedFiles];
      validatingFiles[uploadedFiles.length + index].status = 'validating';
      setUploadedFiles([...validatingFiles]);

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        const progressFiles = [...validatingFiles];
        progressFiles[uploadedFiles.length + index].progress = progress;
        setUploadedFiles([...progressFiles]);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Process file
      const { variables, errors } = await processFile(file);

      // Update final status
      const finalFiles = [...validatingFiles];
      finalFiles[uploadedFiles.length + index].status = errors.length > 0 ? 'invalid' : 'valid';
      finalFiles[uploadedFiles.length + index].errors = errors;
      finalFiles[uploadedFiles.length + index].variables = variables;
      setUploadedFiles([...finalFiles]);
    });

    onFilesChange(updatedFiles);
  }, [uploadedFiles, maxFiles, onFilesChange, processFile]);

  const removeFile = useCallback((fileId: string) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(updatedFiles);
    onFilesChange(updatedFiles);
  }, [uploadedFiles, onFilesChange]);

  const clearAll = useCallback(() => {
    setUploadedFiles([]);
    onFilesChange([]);
  }, [onFilesChange]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleFiles,
    accept: accept.reduce((acc, ext) => {
      const mimeType = getMimeTypeForExtension(ext);
      if (mimeType) {
        acc[mimeType] = [ext];
      }
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles: maxFiles - uploadedFiles.length,
    maxSize: maxSize * 1024 * 1024,
    disabled,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false)
  });

  const getMimeTypeForExtension = (ext: string): string | null => {
    const mimeTypes: Record<string, string> = {
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pdf': 'application/pdf'
    };
    return mimeTypes[ext] || null;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="h-4 w-4 text-red-500" />;
    if (ext === 'docx') return <FileText className="h-4 w-4 text-blue-500" />;
    if (ext === 'md') return <FileText className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validFiles = uploadedFiles.filter(f => f.status === 'valid').length;
  const invalidFiles = uploadedFiles.filter(f => f.status === 'invalid').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Zone */}
      <Card
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'cursor-not-allowed opacity-50',
          uploadedFiles.length >= maxFiles && 'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <div className="p-8 text-center">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? 'Drop files here' : 'Upload Template Files'}
          </h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop template files here, or click to select files
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {accept.map(ext => (
              <Badge key={ext} variant="secondary">
                {ext}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Maximum {maxFiles} files, up to {maxSize}MB each
          </p>
        </div>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">
              Uploaded Files ({uploadedFiles.length}/{maxFiles})
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              disabled={disabled}
            >
              Clear All
            </Button>
          </div>

          {/* Status Summary */}
          {(validFiles > 0 || invalidFiles > 0) && (
            <div className="flex gap-2 mb-4">
              {validFiles > 0 && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validFiles} Valid
                </Badge>
              )}
              {invalidFiles > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {invalidFiles} Invalid
                </Badge>
              )}
            </div>
          )}

          {/* File Items */}
          <div className="space-y-3">
            {uploadedFiles.map((uploadedFile) => (
              <div key={uploadedFile.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getFileIcon(uploadedFile.file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadedFile.file.size)}
                      </p>

                      {/* Variables */}
                      {uploadedFile.variables && uploadedFile.variables.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Variables ({uploadedFile.variables.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {uploadedFile.variables.slice(0, 5).map(variable => (
                              <Badge key={variable} variant="outline" className="text-xs">
                                {`{{${variable}}}`}
                              </Badge>
                            ))}
                            {uploadedFile.variables.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{uploadedFile.variables.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Errors */}
                      {uploadedFile.errors && uploadedFile.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-red-600 mb-1">
                            Errors:
                          </p>
                          <div className="space-y-1">
                            {uploadedFile.errors.map((error, index) => (
                              <p key={index} className="text-xs text-red-600">
                                • {error}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Progress */}
                      {uploadedFile.status === 'validating' && uploadedFile.progress && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Processing...</span>
                            <span>{uploadedFile.progress}%</span>
                          </div>
                          <Progress value={uploadedFile.progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {uploadedFile.status === 'valid' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {uploadedFile.status === 'invalid' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadedFile.id)}
                      disabled={disabled}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}