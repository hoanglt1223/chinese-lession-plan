import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudUpload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
}

export function FileUpload({ 
  onFilesChange, 
  accept = ".pdf", 
  multiple = true, 
  maxSize = 10 * 1024 * 1024,
  className 
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    onFilesChange(newFiles);
  }, [onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
      if (accept.includes('.pdf') && file.type !== 'application/pdf') return false;
      if (file.size > maxSize) return false;
      return true;
    });
    
    handleFileChange(multiple ? [...files, ...droppedFiles] : droppedFiles.slice(0, 1));
  }, [files, accept, maxSize, multiple, handleFileChange]);

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
    handleFileChange(multiple ? [...files, ...selectedFiles] : selectedFiles.slice(0, 1));
  }, [files, multiple, handleFileChange]);

  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    handleFileChange(newFiles);
  }, [files, handleFileChange]);

  return (
    <div className={className}>
      <div
        className={cn(
          "file-upload-zone",
          isDragOver && "dragover"
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
            <p className="text-sm font-medium text-foreground">Upload PDF files</p>
            <p className="text-xs text-muted-foreground">Raw lesson plans, company requirements</p>
          </div>
          <Button asChild>
            <label className="cursor-pointer">
              Choose Files
              <input
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleInputChange}
                className="hidden"
              />
            </label>
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <File className="text-destructive w-4 h-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
