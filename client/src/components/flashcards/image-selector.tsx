import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Image, Camera, Palette, Shapes, ExternalLink } from 'lucide-react';
import type { FlashcardImage, FreepikIcon } from '@shared/schema';

interface ImageSelectorProps {
  word: string;
  selectedImageId?: string;
  imageOptions?: {
    photos: FlashcardImage[];
    illustrations: FlashcardImage[];
    icons?: FreepikIcon[];
    autoSelected: FlashcardImage | FreepikIcon | null;
    all: (FlashcardImage | FreepikIcon)[];
  };
  onImageSelect: (image: FlashcardImage | FreepikIcon) => void;
  className?: string;
}

export function ImageSelector({ 
  word, 
  selectedImageId, 
  imageOptions, 
  onImageSelect,
  className = "" 
}: ImageSelectorProps) {
  // Default to 'icons' tab if icons are available, otherwise 'all'
  const defaultTab = imageOptions?.icons && imageOptions.icons.length > 0 ? 'icons' : 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'illustrations' | 'icons'>(defaultTab);
  
  if (!imageOptions || !imageOptions.all.length) {
    return (
      <div className={`text-center p-6 border-2 border-dashed border-border rounded-lg ${className}`}>
        <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No images available for "{word}"</p>
      </div>
    );
  }

  const getImagesForTab = () => {
    switch (activeTab) {
      case 'photos':
        return imageOptions.photos;
      case 'illustrations':
        return imageOptions.illustrations;
      case 'icons':
        return imageOptions.icons || [];
      default:
        return imageOptions.all;
    }
  };

  const currentImages = getImagesForTab();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">
          Choose image for "{word}"
        </h4>
        <div className="flex text-xs text-muted-foreground gap-2">
          <span>{imageOptions.photos.length} photos</span>
          <span>•</span>
          <span>{imageOptions.illustrations.length} illustrations</span>
          <span>•</span>
          <span>{imageOptions.icons?.length || 0} icons</span>
        </div>
      </div>

      {/* Auto-selected indicator */}
      {imageOptions.autoSelected && (
        <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-md">
          <Check className="w-4 h-4 text-accent" />
          <span className="text-xs text-accent font-medium">
            Auto-selected: {
              imageOptions.autoSelected.type === 'photo' ? 'Photo' : 
              imageOptions.autoSelected.type === 'icon' ? 'Icon' : 
              'Illustration'
            }
          </span>
        </div>
      )}

      {/* Tab filters */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('all')}
          className="text-xs h-7 px-3 sm:px-3 px-2"
        >
          <Image className="w-3 h-3 sm:mr-1" />
          <span className="hidden sm:inline">All ({imageOptions.all.length})</span>
        </Button>
        <Button
          variant={activeTab === 'icons' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('icons')}
          className="text-xs h-7 px-3 sm:px-3 px-2"
        >
          <Shapes className="w-3 h-3 sm:mr-1" />
          <span className="hidden sm:inline">({imageOptions.icons?.length || 0})</span>
        </Button>
        <Button
          variant={activeTab === 'illustrations' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('illustrations')}
          className="text-xs h-7 px-3 sm:px-3 px-2"
        >
          <Palette className="w-3 h-3 sm:mr-1" />
          <span className="hidden sm:inline">({imageOptions.illustrations.length})</span>
        </Button>
        <Button
          variant={activeTab === 'photos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('photos')}
          className="text-xs h-7 px-3 sm:px-3 px-2"
        >
          <Camera className="w-3 h-3 sm:mr-1" />
          <span className="hidden sm:inline">({imageOptions.photos.length})</span>
        </Button>
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {currentImages.map((image, index) => {
          const isSelected = selectedImageId === image.id;
          const isAutoSelected = imageOptions.autoSelected?.id === image.id;
          
          return (
            <Card 
              key={image.id}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                isSelected 
                  ? 'ring-2 ring-primary ring-offset-2 shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => onImageSelect(image)}
            >
              <CardContent className="p-0 relative">
                <div className="aspect-square relative overflow-hidden rounded-lg">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.error('Image failed to load:', {
                        src: image.url,
                        type: image.type,
                        id: image.id,
                        error: e
                      });
                      target.style.display = 'none';
                    }}
                    onLoad={() => {
                      if (image.type === 'icon') {
                        console.log('Freepik icon loaded successfully:', {
                          src: image.url,
                          id: image.id
                        });
                      }
                    }}
                  />
                  
                  {/* Selection overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                  
                  {/* Auto-selected badge */}
                  {isAutoSelected && !isSelected && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-1 right-1 text-xs px-1 py-0"
                    >
                      Auto
                    </Badge>
                  )}
                  
                  {/* Image type badge */}
                  <Badge 
                    variant="outline" 
                    className="absolute top-1 left-1 text-xs px-1 py-0 bg-background/80"
                  >
                    {image.type === 'photo' ? (
                      <Camera className="w-3 h-3" />
                    ) : image.type === 'icon' ? (
                      <Shapes className="w-3 h-3" />
                    ) : (
                      <Palette className="w-3 h-3" />
                    )}
                  </Badge>
                </div>
                
                {/* Image info */}
                <div className="p-2 space-y-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {image.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {image.credit}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(image.sourceUrl, '_blank');
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No images in current tab */}
      {currentImages.length === 0 && (
        <div className="text-center p-6">
          <p className="text-sm text-muted-foreground">
            No {activeTab === 'all' ? 'images' : activeTab} available for "{word}"
            {activeTab === 'icons' && ' (Freepik API required)'}
          </p>
        </div>
      )}
    </div>
  );
}
