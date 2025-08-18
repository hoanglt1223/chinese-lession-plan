import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, GripVertical, Download, Images } from "lucide-react";
import { ImageSelector } from "./image-selector";
import type { FlashcardImage, FreepikIcon } from "@shared/schema";

interface Flashcard {
  id?: string;
  word: string;
  pinyin: string;
  vietnamese: string;
  partOfSpeech?: string;
  imageQuery?: string;
  imageUrl?: string;
  // New image options from Unsplash and Freepik
  imageOptions?: {
    photos: FlashcardImage[];
    illustrations: FlashcardImage[];
    icons?: FreepikIcon[];
    autoSelected: FlashcardImage | FreepikIcon | null;
    all: (FlashcardImage | FreepikIcon)[];
  };
  selectedImageId?: string; // Track which image user selected
}

interface FlashcardEditorProps {
  flashcards: Flashcard[];
  onChange: (flashcards: Flashcard[]) => void;
}

export function FlashcardEditor({ flashcards, onChange }: FlashcardEditorProps) {
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [showImageSelector, setShowImageSelector] = useState(false);
  
  // Update selected card when flashcards change and ensure IDs
  useEffect(() => {
    // Add IDs to flashcards if they don't have them
    const flashcardsWithIds = flashcards.map(card => ({
      ...card,
      id: card.id || crypto.randomUUID()
    }));
    
    if (JSON.stringify(flashcardsWithIds) !== JSON.stringify(flashcards)) {
      onChange(flashcardsWithIds);
    }
    
    if (flashcardsWithIds.length > 0 && !selectedCard) {
      setSelectedCard(flashcardsWithIds[0]);
    }
  }, [flashcards, selectedCard, onChange]);

  const updateCard = (cardId: string, updates: Partial<Flashcard>) => {
    const updated = flashcards.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    );
    onChange(updated);
    if (selectedCard?.id === cardId) {
      setSelectedCard({ ...selectedCard, ...updates });
    }
  };

  const addCard = () => {
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      word: "新词",
      pinyin: "xīn cí",
      vietnamese: "từ mới",
      imageUrl: ""
    };
    const updated = [...flashcards, newCard];
    onChange(updated);
    setSelectedCard(newCard);
  };

  const downloadPDF = async () => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentType: 'flashcard-pdf',
          flashcards 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `Flashcard_${Date.now()}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Template Editor */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 border-b border-border flex justify-between items-center">
          <span className="text-xs font-medium text-muted-foreground">
            PDF Template Editor ({flashcards.length} cards)
          </span>
          {flashcards.length > 0 && (
            <Button
              onClick={downloadPDF}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Download PDF
            </Button>
          )}
        </div>
        
        {flashcards.length > 0 && selectedCard && (
          <div className="p-4">
            {/* Card Preview */}
            <Card className="flashcard-preview mb-3">
              <CardContent className="p-4">
                <div className="w-full h-40 bg-gradient-to-br from-primary/10 to-accent/10 rounded mb-2 flex items-center justify-center relative overflow-hidden">
                  {selectedCard.imageUrl && !selectedCard.imageUrl.includes('placeholder') && !selectedCard.imageUrl.includes('via.placeholder') ? (
                    <img 
                      src={selectedCard.imageUrl} 
                      alt={selectedCard.word}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        console.error('Failed to load image:', selectedCard.imageUrl);
                        e.currentTarget.style.display = 'none';
                        const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder-fallback') as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', selectedCard.imageUrl);
                      }}
                    />
                  ) : null}
                  <div 
                    className="placeholder-fallback absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground text-xs"
                    style={{display: selectedCard.imageUrl && !selectedCard.imageUrl.includes('placeholder') && !selectedCard.imageUrl.includes('via.placeholder') ? 'none' : 'flex'}}
                  >
                    <span className="text-2xl mb-1">{selectedCard.word}</span>
                    <span className="text-xs">
                      {selectedCard.imageUrl && selectedCard.imageUrl.includes('placeholder') ? 'Placeholder image' : 'AI image loading...'}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-bold text-foreground mb-1">
                    {selectedCard.word}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCard.pinyin}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Properties Panel */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Word:</span>
                {editingCard?.id === selectedCard.id ? (
                  <Input
                    value={editingCard?.word || ''}
                    onChange={(e) => setEditingCard(editingCard ? {
                      ...editingCard,
                      word: e.target.value
                    } : null)}
                    className="h-6 text-xs w-20"
                    onBlur={() => {
                      if (editingCard && editingCard.id) {
                        updateCard(editingCard.id, editingCard);
                        setEditingCard(null);
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">{selectedCard.word}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCard(selectedCard || null)}
                      className="h-4 w-4 p-0"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pinyin:</span>
                <span className="font-medium">{selectedCard.pinyin}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Vietnamese:</span>
                <span className="font-medium">{selectedCard.vietnamese}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Image:</span>
                <div className="flex gap-1">
                  {selectedCard?.imageOptions?.all && selectedCard.imageOptions.all.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 text-accent hover:text-accent/80"
                      onClick={() => setShowImageSelector(!showImageSelector)}
                    >
                      <Images className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 text-accent hover:text-accent/80"
                    onClick={() => {
                      const newImageUrl = prompt("Enter new image URL:");
                      if (newImageUrl && selectedCard?.id) {
                        updateCard(selectedCard.id, { imageUrl: newImageUrl });
                      }
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {/* Image selector */}
              {showImageSelector && selectedCard?.imageOptions && (
                <div className="mt-3 border rounded-lg p-3">
                  <ImageSelector
                    word={selectedCard.word}
                    selectedImageId={selectedCard.selectedImageId}
                    imageOptions={selectedCard.imageOptions}
                    onImageSelect={(image: FlashcardImage | FreepikIcon) => {
                      if (selectedCard?.id) {
                        updateCard(selectedCard.id, {
                          imageUrl: image.url,
                          selectedImageId: image.id,
                        });
                        setShowImageSelector(false);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Flashcard List */}
      {flashcards.length > 0 && (
        <div className="text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">
              Generated Cards ({flashcards.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={addCard}
              className="h-6 w-6 p-0 text-accent"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {flashcards.map((card) => (
              <div
                key={card.id || crypto.randomUUID()}
                className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                  selectedCard?.id === card.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'bg-muted/50 hover:bg-muted'
                }`}
                onClick={() => setSelectedCard(card)}
              >
                <div className="w-6 h-6 bg-muted rounded flex-shrink-0 overflow-hidden">
                  <img 
                    src={card.imageUrl} 
                    alt={card.word}
                    className="w-full h-full object-cover"
                                         onError={(e) => {
                       e.currentTarget.style.display = "none";
                     }}
                  />
                </div>
                <span className="flex-1 truncate font-medium">{card.word}</span>
                <GripVertical className="w-3 h-3 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
