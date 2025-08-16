import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Eye, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Start typing...",
  readOnly = false,
  className 
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleSave = () => {
    setLastSaved(new Date());
    // Auto-save functionality would go here
  };

  // Simple markdown to HTML conversion for preview
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/^\* (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/^\- (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={cn("markdown-editor", className)}>
      <div className="toolbar">
        <div className="flex items-center space-x-4">
          <Button
            variant={!isPreview ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsPreview(false)}
            disabled={readOnly}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant={isPreview ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsPreview(true)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Save className="w-4 h-4" />
          <span>
            {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Auto-saved"}
          </span>
        </div>
      </div>

      <div className="content">
        {isPreview ? (
          <div 
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ 
              __html: renderMarkdown(value) 
            }}
          />
        ) : (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className="min-h-64 max-h-96 resize-none border-0 focus:ring-0 text-sm font-mono"
          />
        )}
      </div>
    </div>
  );
}
