import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Edit3 } from "lucide-react";

interface VocabularyEditorProps {
  vocabulary: string[];
  onChange: (vocabulary: string[]) => void;
}

export function VocabularyEditor({ vocabulary, onChange }: VocabularyEditorProps) {
  const [newWord, setNewWord] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const addWord = () => {
    if (newWord.trim() && !vocabulary.includes(newWord.trim())) {
      onChange([...vocabulary, newWord.trim()]);
      setNewWord("");
    }
  };

  const removeWord = (index: number) => {
    const updated = vocabulary.filter((_, i) => i !== index);
    onChange(updated);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue(vocabulary[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      const updated = [...vocabulary];
      updated[editingIndex] = editingValue.trim();
      onChange(updated);
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  return (
    <div className="space-y-4">
      {/* Current vocabulary list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Current Vocabulary ({vocabulary.length} words)</h4>
        <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border border-border rounded-md">
          {vocabulary.length === 0 ? (
            <span className="text-sm text-muted-foreground">No vocabulary words yet</span>
          ) : (
            vocabulary.map((word, index) => (
              <div key={index} className="flex items-center">
                {editingIndex === index ? (
                  <div className="flex items-center space-x-1">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="w-20 h-6 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={saveEdit}
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={cancelEdit}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <Badge 
                    variant="secondary" 
                    className="group cursor-pointer hover:bg-secondary/80"
                    onClick={() => startEditing(index)}
                  >
                    <span className="mr-1">{word}</span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 className="w-3 h-3" />
                      <X 
                        className="w-3 h-3 hover:text-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWord(index);
                        }}
                      />
                    </div>
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add new word */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Add New Word</h4>
        <div className="flex space-x-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Enter Chinese word (e.g., 小鸟)"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addWord();
            }}
          />
          <Button 
            onClick={addWord}
            disabled={!newWord.trim() || vocabulary.includes(newWord.trim())}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        {newWord.trim() && vocabulary.includes(newWord.trim()) && (
          <p className="text-xs text-muted-foreground">This word is already in the list</p>
        )}
      </div>

      {/* Helper text */}
      <div className="text-xs text-muted-foreground">
        <p>• Click on any word to edit it</p>
        <p>• Click the × to remove a word</p>
        <p>• Add new Chinese vocabulary words to generate flashcards</p>
      </div>
    </div>
  );
}