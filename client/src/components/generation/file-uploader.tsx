import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudUpload, File, X, Eye, AlertCircle, CheckCircle, FileText, Image, FileSpreadsheet, FileArchive } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
  extractedText?: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    extractedAt?: Date;
  };
}

interface FileUploaderProps {
  onFilesChange?: (files: UploadedFile[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
  onUploadComplete?: (files: UploadedFile[]) => void;
}

export function FileUploader({
  onFilesChange,
  accept = ".pdf,.docx,.doc,.txt,.md,.xlsx,.xls",
  multiple = true,
  maxSize = 50 * 1024 * 1024, // 50MB
  className,
  disabled = false,
  onUploadComplete
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    onFilesChange?.(newFiles);

    // Check if all files are completed
    const allCompleted = newFiles.every(f => f.status === 'completed');
    if (allCompleted && newFiles.length > 0) {
      onUploadComplete?.(newFiles);
    }
  }, [onFilesChange, onUploadComplete]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText;
    if (type.includes('image')) return Image;
    if (type.includes('sheet') || type.includes('excel')) return FileSpreadsheet;
    if (type.includes('zip') || type.includes('rar')) return FileArchive;
    return File;
  };

  const simulateUpload = useCallback((uploadedFiles: UploadedFile[]) => {
    let updatedFiles = [...uploadedFiles];

    const uploadInterval = setInterval(() => {
      updatedFiles = updatedFiles.map(file => {
        if (file.status === 'pending') {
          return { ...file, status: 'uploading' as const, uploadProgress: 0 };
        }
        if (file.status === 'uploading' && file.uploadProgress < 90) {
          return { ...file, uploadProgress: Math.min(file.uploadProgress + 10, 90) };
        }
        if (file.status === 'uploading' && file.uploadProgress >= 90) {
          return { ...file, status: 'processing' as const, uploadProgress: 90 };
        }
        if (file.status === 'processing') {
          return {
            ...file,
            status: 'completed' as const,
            uploadProgress: 100,
            metadata: {
              pageCount: Math.floor(Math.random() * 10) + 1,
              wordCount: Math.floor(Math.random() * 5000) + 500,
              extractedAt: new Date()
            }
          };
        }
        return file;
      });

      handleFilesChange(updatedFiles);

      const allCompleted = updatedFiles.every(f => f.status === 'completed');
      if (allCompleted) {
        clearInterval(uploadInterval);
      }
    }, 300);
  }, [handleFilesChange]);

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList);
    const processedFiles: UploadedFile[] = fileArray.map(file => {
      const fileType = file.type || '';
      const extension = file.name.split('.').pop()?.toLowerCase() || '';

      return {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: fileType || `application/${extension}`,
        uploadProgress: 0,
        status: 'pending'
      };
    });

    const validFiles = processedFiles.filter(file => {
      if (file.size > maxSize) {
        return false;
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''));
      return allowedExtensions.includes(fileExtension || '');
    });

    const newFiles = multiple ? [...files, ...validFiles] : validFiles.slice(0, 1);
    handleFilesChange(newFiles);

    // Start upload simulation
    setTimeout(() => simulateUpload(newFiles), 500);
  }, [files, multiple, accept, maxSize, handleFilesChange, simulateUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [disabled, processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      processFiles(selectedFiles);
    }
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    const newFiles = files.filter(file => file.id !== fileId);
    handleFilesChange(newFiles);
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  }, [files, handleFilesChange, selectedFile]);

  const retryUpload = useCallback((fileId: string) => {
    const newFiles = files.map(file =>
      file.id === fileId
        ? { ...file, status: 'pending' as const, uploadProgress: 0, error: undefined }
        : file
    );
    handleFilesChange(newFiles);
    simulateUpload(newFiles);
  }, [files, handleFilesChange, simulateUpload]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Source Files</CardTitle>
          <CardDescription>
            Upload PDFs, Word documents, Excel files, or text files to generate content from.
            Maximum file size: {formatFileSize(maxSize)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "file-upload-zone border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleFileInput}
              className="hidden"
              disabled={disabled}
            />

            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <CloudUpload className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to select files
                </p>
              </div>
              <Button variant="outline" disabled={disabled}>
                Choose Files
              </Button>
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, DOCX, DOC, TXT, MD, XLSX, XLS
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((uploadedFile) => {
                const FileIcon = getFileIcon(uploadedFile.type);
                const isCompleted = uploadedFile.status === 'completed';
                const hasError = uploadedFile.status === 'error';

                return (
                  <div
                    key={uploadedFile.id}
                    className={cn(
                      "border rounded-lg p-4 transition-all",
                      selectedFile?.id === uploadedFile.id && "ring-2 ring-primary",
                      hasError && "border-destructive/50 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <FileIcon className={cn(
                        "w-6 h-6 mt-1 flex-shrink-0",
                        hasError ? "text-destructive" :
                        isCompleted ? "text-green-500" : "text-muted-foreground"
                      )} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium truncate">{uploadedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(uploadedFile.size)}
                            </p>

                            {/* Status Badge */}
                            <Badge
                              variant={
                                uploadedFile.status === 'completed' ? 'default' :
                                uploadedFile.status === 'error' ? 'destructive' :
                                'secondary'
                              }
                              className="mt-1"
                            >
                              {uploadedFile.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {uploadedFile.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                              {uploadedFile.status}
                            </Badge>

                            {/* Metadata */}
                            {uploadedFile.metadata && (
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                {uploadedFile.metadata.pageCount && (
                                  <span>Pages: {uploadedFile.metadata.pageCount}</span>
                                )}
                                {uploadedFile.metadata.wordCount && (
                                  <span>Words: {uploadedFile.metadata.wordCount}</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isCompleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedFile(uploadedFile)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                              </Button>
                            )}

                            {hasError && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => retryUpload(uploadedFile.id)}
                              >
                                Retry
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(uploadedFile.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Upload Progress */}
                        {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>
                                {uploadedFile.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                              </span>
                              <span>{uploadedFile.uploadProgress}%</span>
                            </div>
                            <Progress value={uploadedFile.uploadProgress} className="h-2" />
                          </div>
                        )}

                        {/* Error Message */}
                        {uploadedFile.error && (
                          <Alert variant="destructive" className="mt-3">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>{uploadedFile.error}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Preview */}
      {selectedFile && selectedFile.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              File Preview: {selectedFile.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="metadata" className="w-full">
              <TabsList>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="content">Content Preview</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">File Name</label>
                    <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">File Size</label>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">File Type</label>
                    <p className="text-sm text-muted-foreground">{selectedFile.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Upload Date</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedFile.metadata?.extractedAt?.toLocaleDateString() || 'N/A'}
                    </p>
                  </div>
                  {selectedFile.metadata?.pageCount && (
                    <div>
                      <label className="text-sm font-medium">Page Count</label>
                      <p className="text-sm text-muted-foreground">{selectedFile.metadata.pageCount}</p>
                    </div>
                  )}
                  {selectedFile.metadata?.wordCount && (
                    <div>
                      <label className="text-sm font-medium">Word Count</label>
                      <p className="text-sm text-muted-foreground">{selectedFile.metadata.wordCount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <Alert>
                  <FileText className="w-4 h-4" />
                  <AlertDescription>
                    Content extraction will be performed during the generation step.
                    You'll be able to review and edit the extracted content before proceeding.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    File processing settings will be configured in the next step.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}