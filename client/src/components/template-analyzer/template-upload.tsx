import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Progress } from '../ui/progress.js';
import { Alert, AlertDescription } from '../ui/alert.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Textarea } from '../ui/textarea.js';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Download,
  Trash2
} from 'lucide-react';

import { analyzeTemplate } from '../../lib/template-analyzer.js';
import type { TemplateAnalysis } from '../../../../shared/schema.js';

interface TemplateFile {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
  uploadedAt: Date;
  analysis?: TemplateAnalysis;
}

interface TemplateUploadProps {
  onTemplateAnalyzed?: (file: TemplateFile) => void;
  maxFileSize?: number; // in bytes
  acceptedFormats?: string[];
}

export function TemplateUpload({
  onTemplateAnalyzed,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  acceptedFormats = ['.txt', '.md', '.markdown']
}: TemplateUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<TemplateFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [manualContent, setManualContent] = useState('');
  const [manualName, setManualName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidFormat = acceptedFormats.includes(extension);
      const isValidSize = file.size <= maxFileSize;

      if (!isValidFormat) {
        alert(`Invalid file format: ${file.name}. Accepted formats: ${acceptedFormats.join(', ')}`);
        return false;
      }

      if (!isValidSize) {
        alert(`File too large: ${file.name}. Maximum size: ${formatFileSize(maxFileSize)}`);
        return false;
      }

      return true;
    });

    setUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress((i / validFiles.length) * 100);

      try {
        const content = await readFileContent(file);
        const templateFile: TemplateFile = {
          id: generateId(),
          name: file.name,
          content,
          size: file.size,
          type: file.type,
          uploadedAt: new Date()
        };

        setUploadedFiles(prev => [...prev, templateFile]);
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error);
        alert(`Failed to read file: ${file.name}`);
      }
    }

    setUploadProgress(100);
    setUploading(false);
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          resolve(content);
        } else {
          reject(new Error('Empty file content'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleManualUpload = () => {
    if (!manualContent.trim() || !manualName.trim()) {
      alert('Please provide both name and content for the template');
      return;
    }

    const templateFile: TemplateFile = {
      id: generateId(),
      name: manualName.trim(),
      content: manualContent.trim(),
      size: new Blob([manualContent]).size,
      type: 'text/plain',
      uploadedAt: new Date()
    };

    setUploadedFiles(prev => [...prev, templateFile]);
    setManualContent('');
    setManualName('');
  };

  const analyzeFile = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    setAnalyzing(fileId);
    try {
      const result = await analyzeTemplate({
        content: file.content,
        options: {
          detectLanguage: true,
          extractVariables: true,
          analyzeStructure: true,
          scoreQuality: true
        }
      });

      const updatedFile = { ...file, analysis: result.analysis };
      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? updatedFile : f)
      );

      onTemplateAnalyzed?.(updatedFile);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze template');
    } finally {
      setAnalyzing(null);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const downloadFile = (file: TemplateFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const previewFile = (file: TemplateFile) => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${file.name}</title>
            <style>
              body { font-family: monospace; padding: 20px; white-space: pre-wrap; }
            </style>
          </head>
          <body>${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Template Files</CardTitle>
          <CardDescription>
            Upload template files for analysis. Supports text and markdown files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              Drop template files here
            </h3>
            <p className="text-muted-foreground mb-4">
              or click to browse
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedFormats.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-4">
              Accepted formats: {acceptedFormats.join(', ')} • Max size: {formatFileSize(maxFileSize)}
            </p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading files...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Manual Entry */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Manual Entry</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="Enter template name..."
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-content">Template Content</Label>
                <Textarea
                  id="template-content"
                  placeholder="Enter template content here..."
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  className="min-h-[150px] font-mono"
                />
              </div>
              <Button onClick={handleManualUpload} disabled={!manualName.trim() || !manualContent.trim()}>
                <Upload className="h-4 w-4 mr-2" />
                Add Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Templates</CardTitle>
            <CardDescription>
              {uploadedFiles.length} template{uploadedFiles.length !== 1 ? 's' : ''} uploaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((file) => (
                <Card key={file.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{file.name}</span>
                        <Badge variant="outline">{formatFileSize(file.size)}</Badge>
                        <Badge variant="secondary">
                          {file.uploadedAt.toLocaleDateString()}
                        </Badge>
                        {file.analysis && (
                          <Badge variant="default" className="bg-green-600">
                            Analyzed
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {file.content.length} characters • {file.content.split(/\s+/).filter(w => w).length} words
                      </p>

                      {file.analysis && (
                        <div className="flex items-center gap-4 text-sm">
                          <span>Quality: <strong className={
                            file.analysis.quality.overall >= 90 ? 'text-green-600' :
                            file.analysis.quality.overall >= 70 ? 'text-blue-600' :
                            'text-orange-600'
                          }>{file.analysis.quality.overall}/100</strong></span>
                          <span>Variables: <strong>{file.analysis.variables.length}</strong></span>
                          <span>Complexity: <strong>{file.analysis.structure.complexity}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!file.analysis && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => analyzeFile(file.id)}
                          disabled={analyzing === file.id}
                        >
                          {analyzing === file.id ? (
                            <>Analyzing...</>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Analyze
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => previewFile(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}