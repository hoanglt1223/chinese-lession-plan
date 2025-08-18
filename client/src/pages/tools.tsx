import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Image as ImageIcon, 
  Languages, 
  BookOpen, 
  Wand2, 
  Volume2, 
  FileImage,
  Download,
  Upload,
  Loader2,
  Copy,
  Check,
  CheckCircle,
  GraduationCap,
  ArrowLeft,
  DollarSign,
  LogOut,
  Mic,
  FileAudio,
  Plus
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAI } from "@/contexts/AIContext";

export default function Tools() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const { settings: aiSettings } = useAI();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      return response.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  // Convert Tool States
  const [convertInput, setConvertInput] = useState("");
  const [convertFrom, setConvertFrom] = useState("markdown");
  const [convertTo, setConvertTo] = useState("docx");
  const [convertResult, setConvertResult] = useState("");
  const [convertFile, setConvertFile] = useState<File | null>(null);

  // Image Generation States
  const [imageDescription, setImageDescription] = useState("");
  const [imageStyle, setImageStyle] = useState("educational");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");

  // Text-to-Image States
  const [textToImageText, setTextToImageText] = useState("");
  const [textToImageStyle, setTextToImageStyle] = useState("default");
  const [generatedTextImageUrl, setGeneratedTextImageUrl] = useState("");
  const [textImageOptions, setTextImageOptions] = useState({
    width: 400,
    height: 200,
    fontSize: 24,
    fontColor: "#000000",
    backgroundColor: "#ffffff"
  });

  // Chinese Text Render (Serverless Export) States
  const [chineseText, setChineseText] = useState("");
  const [chineseTextImageUrl, setChineseTextImageUrl] = useState("");
  const [cnOptions, setCnOptions] = useState({
    width: 600,
    height: 180,
    fontSize: 64,
    fontColor: "#111111",
    backgroundColor: "#ffffff"
  });

  // Translation States
  const [translationText, setTranslationText] = useState("");
  const [translationFrom, setTranslationFrom] = useState("chinese");
  const [translationTo, setTranslationTo] = useState("vietnamese");
  const [translationResult, setTranslationResult] = useState("");

  // Vocabulary Extraction States
  const [vocabularyText, setVocabularyText] = useState("");
  const [vocabularyLevel, setVocabularyLevel] = useState("preschool");
  const [extractedVocabulary, setExtractedVocabulary] = useState<string[]>([]);

  // Text-to-Speech States
  const [ttsText, setTtsText] = useState("");
  const [ttsLanguage, setTtsLanguage] = useState("zh-CN");
  const [audioUrl, setAudioUrl] = useState("");

  // Lesson Analysis States
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Prompt Optimization States
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [promptPurpose, setPromptPurpose] = useState("general");
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [promptImprovement, setPromptImprovement] = useState<any>(null);

  // Speech to Text States
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [transcription, setTranscription] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<"record" | "upload">("upload");

  // Flashcard Creator States
  const [flashcardItems, setFlashcardItems] = useState<Array<{
    id: string;
    type: 'text' | 'image';
    content: string;
    chineseWord: string;
    pinyin: string;
    imageFile?: File;
  }>>([]);
  const [currentChineseWord, setCurrentChineseWord] = useState("");
  const [currentPinyin, setCurrentPinyin] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [currentType, setCurrentType] = useState<'text' | 'image'>('text');
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
      toast({ title: "Copied to clipboard" });
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  // Convert Tool Mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      if (convertFile) {
        // Handle file upload
        const formData = new FormData();
        formData.append('file', convertFile);
        formData.append('from', convertFrom);
        formData.append('to', convertTo);
        
        const response = await fetch('/api/tools/convert-file', {
          method: 'POST',
          body: formData
        });
        return response.json();
      } else {
        // Handle text input
        const response = await fetch('/api/tools/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: convertInput,
            from: convertFrom,
            to: convertTo,
            aiModel: aiSettings.selectedModel,
            outputLanguage: aiSettings.outputLanguage
          })
        });
        return response.json();
      }
    },
    onSuccess: (data) => {
      setConvertResult(data.result);
      toast({ title: "Content converted successfully" });
    },
    onError: () => {
      toast({ title: "Conversion failed", variant: "destructive" });
    }
  });

  // Image Generation Mutation
  const imageGenMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/tools/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: imageDescription,
          style: imageStyle,
          aiModel: aiSettings.selectedModel,
          outputLanguage: aiSettings.outputLanguage
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedImageUrl(data.imageUrl);
      toast({ title: "Image generated successfully" });
    },
    onError: () => {
      toast({ title: "Image generation failed", variant: "destructive" });
    }
  });

  // Text-to-Image Mutation
  const textToImageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/tools/text-to-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToImageText,
          library: "chinese-api", // Always use Chinese API now
          style: textToImageStyle,
          options: textImageOptions
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedTextImageUrl(data.imageUrl);
      toast({ title: "Text image generated successfully!" });
    },
    onError: (error) => {
      console.error('Text-to-image error:', error);
      toast({ title: "Text-to-image generation failed", variant: "destructive" });
    }
  });

  // Chinese Text to PNG (via unified export)
  const chineseTextToImageMutation = useMutation({
    mutationFn: async () => {
      if (!chineseText.trim()) throw new Error('No text provided');
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'chinese-text-image',
          text: chineseText,
          width: cnOptions.width,
          height: cnOptions.height,
          fontSize: cnOptions.fontSize,
          background: cnOptions.backgroundColor,
          textColor: cnOptions.fontColor,
        })
      });
      if (!response.ok) throw new Error('Request failed');
      // Return blob so we can create an object URL
      return response.blob();
    },
    onSuccess: (blob) => {
      // Create object URL for preview
      const url = URL.createObjectURL(blob);
      setChineseTextImageUrl(url);
      toast({ title: "Chinese text image generated!" });
    },
    onError: (error) => {
      console.error('Chinese text-to-image error:', error);
      toast({ title: "Chinese text image generation failed", variant: "destructive" });
    }
  });

  // Chinese Text to PDF (multiple lines)
  const chineseTextToPDFMutation = useMutation({
    mutationFn: async () => {
      if (!chineseText.trim()) throw new Error('No text provided');
      const lines = chineseText.split('\n').filter(line => line.trim());
      if (lines.length === 0) throw new Error('No valid text lines');
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'chinese-text-pdf',
          texts: lines,
          width: cnOptions.width,
          height: cnOptions.height,
          fontSize: cnOptions.fontSize,
          background: cnOptions.backgroundColor,
          textColor: cnOptions.fontColor,
        })
      });
      if (!response.ok) throw new Error('Request failed');
      return response.blob();
    },
    onSuccess: (blob) => {
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Chinese_Text_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Chinese text PDF generated!" });
    },
    onError: (error) => {
      console.error('Chinese text-to-PDF error:', error);
      toast({ title: "Chinese text PDF generation failed", variant: "destructive" });
    }
  });

  // Translation Mutation
  const translationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/tools/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translationText,
          from: translationFrom,
          to: translationTo,
          aiModel: aiSettings.selectedModel,
          outputLanguage: aiSettings.outputLanguage
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setTranslationResult(data.translation);
      toast({ title: "Translation completed" });
    },
    onError: () => {
      toast({ title: "Translation failed", variant: "destructive" });
    }
  });

  // Vocabulary Extraction Mutation
  const vocabularyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/tools/extract-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: vocabularyText,
          level: vocabularyLevel,
          aiModel: aiSettings.selectedModel,
          outputLanguage: aiSettings.outputLanguage
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedVocabulary(data.vocabulary);
      toast({ title: "Vocabulary extracted successfully" });
    },
    onError: () => {
      toast({ title: "Vocabulary extraction failed", variant: "destructive" });
    }
  });

  // Text-to-Speech Mutation
  const ttsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/tools/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          language: ttsLanguage
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAudioUrl(data.audioUrl);
      toast({ title: "Audio generated successfully" });
    },
    onError: () => {
      toast({ title: "Audio generation failed", variant: "destructive" });
    }
  });

  // Lesson Analysis Mutation
  const analysisMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: analysisText,
          aiModel: aiSettings.selectedModel,
          outputLanguage: aiSettings.outputLanguage
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({ title: "Analysis completed" });
    },
    onError: () => {
      toast({ title: "Analysis failed", variant: "destructive" });
    }
  });

  // Prompt Optimization Mutation
  const promptOptimizeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt,
          purpose: promptPurpose,
          aiModel: aiSettings.selectedModel,
          outputLanguage: aiSettings.outputLanguage
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setOptimizedPrompt(data.optimizedPrompt);
      setPromptImprovement(data.improvement);
      toast({ title: "Prompt optimized successfully" });
    },
    onError: () => {
      toast({ title: "Prompt optimization failed", variant: "destructive" });
    }
  });

  // Speech to Text Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({ title: "Failed to access microphone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Speech to Text Mutation
  const speechToTextMutation = useMutation({
    mutationFn: async () => {
      const fileToProcess = audioFile || audioBlob;
      if (!fileToProcess) throw new Error("No audio file or recording");
      
      const formData = new FormData();
      if (audioFile) {
        formData.append('audio', audioFile);
      } else {
        formData.append('audio', audioBlob!, 'recording.wav');
      }
      formData.append('language', aiSettings.outputLanguage);

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData
      });
      return response.json();
    },
    onSuccess: (data) => {
      setTranscription(data.transcription);
      toast({ title: "Audio transcribed successfully" });
    },
    onError: () => {
      toast({ title: "Speech to text failed", variant: "destructive" });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's an audio file
      if (!file.type.startsWith('audio/')) {
        toast({ title: "Please select an audio file", variant: "destructive" });
        return;
      }
      setAudioFile(file);
      setAudioBlob(null); // Clear any recorded audio
    }
  };

  // Flashcard Functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Please select an image file", variant: "destructive" });
        return;
      }
      setCurrentImageFile(file);
      setCurrentContent(file.name);
    }
  };

  const addFlashcardItem = () => {
    if (!currentChineseWord.trim() || !currentPinyin.trim()) {
      toast({ title: "Please fill in Chinese word and pinyin", variant: "destructive" });
      return;
    }

    if (currentType === 'image' && !currentImageFile) {
      toast({ title: "Please select an image for this flashcard", variant: "destructive" });
      return;
    }

    if (currentType === 'text' && !currentContent.trim()) {
      toast({ title: "Please enter text content for this flashcard", variant: "destructive" });
      return;
    }

    const newItem = {
      id: crypto.randomUUID(),
      type: currentType,
      content: currentContent,
      chineseWord: currentChineseWord,
      pinyin: currentPinyin,
      imageFile: currentType === 'image' && currentImageFile ? currentImageFile : undefined
    };

    setFlashcardItems([...flashcardItems, newItem]);

    // Clear form
    setCurrentChineseWord("");
    setCurrentPinyin("");
    setCurrentContent("");
    setCurrentImageFile(null);

    toast({ title: "Flashcard added successfully" });
  };

  const removeFlashcardItem = (id: string) => {
    setFlashcardItems(flashcardItems.filter(item => item.id !== id));
    toast({ title: "Flashcard removed" });
  };

  const clearAllFlashcards = () => {
    setFlashcardItems([]);
    toast({ title: "All flashcards cleared" });
  };

  // Flashcard PDF Generation Mutation
  const flashcardPDFMutation = useMutation({
    mutationFn: async () => {
      if (flashcardItems.length === 0) {
        throw new Error("No flashcards to generate");
      }

      // Convert flashcard items to the format expected by the API
      const flashcards = flashcardItems.map(item => ({
        word: item.chineseWord,
        pinyin: item.pinyin,
        vietnamese: "", // No Vietnamese as requested
        partOfSpeech: "",
        imageQuery: item.type === 'image' ? item.content : item.chineseWord,
        imageUrl: ""
      }));

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'flashcard-pdf',
          flashcards
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    },
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Custom_Flashcards_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Flashcard PDF generated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to generate flashcard PDF", variant: "destructive" });
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-primary rounded-lg flex items-center justify-center">
                  <GraduationCap className="text-primary-foreground text-xs lg:text-sm" />
                </div>
                <h1 className="text-lg lg:text-xl font-bold text-foreground">EduFlow AI Tools</h1>
              </div>
            </div>
            
            <nav className="flex items-center justify-end space-x-2 lg:space-x-4">
              {user && (
                <div className="flex items-center space-x-2 lg:space-x-4">
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs lg:text-sm">
                    <DollarSign className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className="hidden sm:inline">${user.creditBalance}</span>
                    <span className="hidden lg:inline">Credits</span>
                  </Badge>
                  <span className="text-xs lg:text-sm text-muted-foreground hidden md:block">
                    Welcome, {user.username}
                  </span>
                </div>
              )}
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3"
                >
                  <LogOut className="h-3 w-3 lg:h-4 lg:w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-2 sm:p-4 lg:p-8">
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl lg:text-3xl font-bold text-foreground mb-2">AI Teaching Tools</h2>
              <p className="text-sm lg:text-base text-muted-foreground">
                Standalone tools to enhance your Chinese language teaching workflow
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="convert" className="space-y-6">
          <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto p-1">
            <TabsTrigger value="convert" className="text-sm">Convert</TabsTrigger>
            <TabsTrigger value="image" className="text-sm">Images</TabsTrigger>
            <TabsTrigger value="translate" className="text-sm">Translate</TabsTrigger>
            <TabsTrigger value="vocabulary" className="text-sm">Vocabulary</TabsTrigger>
            <TabsTrigger value="audio" className="text-sm">Audio</TabsTrigger>
            <TabsTrigger value="speech" className="text-sm">Speech</TabsTrigger>
            <TabsTrigger value="flashcards" className="text-sm">Flashcards</TabsTrigger>
            <TabsTrigger value="analyze" className="text-sm">Analyze</TabsTrigger>
            <TabsTrigger value="prompt" className="text-sm">Prompt</TabsTrigger>
            <TabsTrigger value="links" className="text-sm">Links</TabsTrigger>
          </TabsList>

          {/* Content Conversion Tool */}
          <TabsContent value="convert">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Content Converter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="convert-from">From Format</Label>
                    <select 
                      id="convert-from"
                      className="w-full mt-1 p-2 border rounded"
                      value={convertFrom}
                      onChange={(e) => setConvertFrom(e.target.value)}
                    >
                      <option value="markdown">Markdown (.md)</option>
                      <option value="text">Plain Text (.txt)</option>
                      <option value="html">HTML (.html)</option>
                      <option value="pdf">PDF (.pdf)</option>
                      <option value="docx">DOCX (.docx)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="convert-to">To Format</Label>
                    <select 
                      id="convert-to"
                      className="w-full mt-1 p-2 border rounded"
                      value={convertTo}
                      onChange={(e) => setConvertTo(e.target.value)}
                    >
                      <option value="docx">DOCX (.docx)</option>
                      <option value="pdf">PDF (.pdf)</option>
                      <option value="html">HTML (.html)</option>
                      <option value="markdown">Markdown (.md)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="convert-file">Upload File</Label>
                    <Input
                      id="convert-file"
                      type="file"
                      accept=".pdf,.docx,.md,.txt,.html"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setConvertFile(file);
                          setConvertInput(""); // Clear text input when file is selected
                        }
                      }}
                      className="mt-1"
                    />
                    {convertFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {convertFile.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    OR
                  </div>
                  
                  <div>
                    <Label htmlFor="convert-input">Paste Content</Label>
                    <Textarea
                      id="convert-input"
                      placeholder="Enter your content here..."
                      className="min-h-32"
                      value={convertInput}
                      onChange={(e) => {
                        setConvertInput(e.target.value);
                        if (e.target.value && convertFile) {
                          setConvertFile(null); // Clear file when typing
                        }
                      }}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => convertMutation.mutate()}
                  disabled={convertMutation.isPending || (!convertInput.trim() && !convertFile)}
                  className="w-full"
                >
                  {convertMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Converting...</>
                  ) : (
                    <><FileText className="w-4 h-4 mr-2" /> Convert Content</>
                  )}
                </Button>

                {convertResult && (
                  <div className="border rounded p-4 bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Converted Content</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(convertResult, 'convert')}
                      >
                        {copiedStates.convert ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm">{convertResult}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Image Generation Tools */}
          <TabsContent value="image" className="space-y-6">
            {/* AI Image Generator Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  AI Image Generator
                </CardTitle>
                <CardDescription>
                  Generate images from text descriptions using AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="image-description">Image Description</Label>
                  <Textarea
                    id="image-description"
                    placeholder="Describe the image you want to generate..."
                    value={imageDescription}
                    onChange={(e) => setImageDescription(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="image-style">Style</Label>
                  <select 
                    id="image-style"
                    className="w-full mt-1 p-2 border rounded"
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value)}
                  >
                    <option value="educational">Educational/Cartoon</option>
                    <option value="realistic">Realistic</option>
                    <option value="artistic">Artistic</option>
                    <option value="simple">Simple/Minimalist</option>
                  </select>
                </div>

                <Button 
                  onClick={() => imageGenMutation.mutate()}
                  disabled={imageGenMutation.isPending || !imageDescription.trim()}
                  className="w-full"
                >
                  {imageGenMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Image...</>
                  ) : (
                    <><Wand2 className="w-4 h-4 mr-2" /> Generate Image</>
                  )}
                </Button>

                {generatedImageUrl && (
                  <div className="border rounded p-4">
                    <img 
                      src={generatedImageUrl} 
                      alt="Generated image"
                      className="w-full max-w-md mx-auto rounded"
                    />
                    <Button 
                      className="w-full mt-2"
                      onClick={() => window.open(generatedImageUrl, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Image
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Text-to-Image Generator Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  Text-to-Image Generator
                </CardTitle>
                <CardDescription>
                  Convert text into images using our unified Chinese API - supports Chinese characters, Pinyin, and all languages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="text-to-image-text">Text Content</Label>
                  <Textarea
                    id="text-to-image-text"
                    placeholder="Enter Chinese characters (美丽), Pinyin (měilì), or any text to convert to image..."
                    value={textToImageText}
                    onChange={(e) => setTextToImageText(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="text-image-style">Text Style</Label>
                    <select 
                      id="text-image-style"
                      className="w-full mt-1 p-2 border rounded"
                      value={textToImageStyle}
                      onChange={(e) => setTextToImageStyle(e.target.value)}
                    >
                      <option value="default">Default</option>
                      <option value="bold">Bold</option>
                      <option value="colorful">Colorful</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-800 font-medium mb-1">Smart Font Detection:</div>
                    <div className="text-xs text-blue-600 space-y-1">
                      <div>• Chinese characters: AaBiMoHengZiZhenBaoKaiShu font, 200px</div>
                      <div>• Pinyin text: Montserrat font, 50px</div>
                      <div>• Other languages: Montserrat font, 50px</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="text-width">Width</Label>
                    <Input
                      id="text-width"
                      type="number"
                      value={textImageOptions.width}
                      onChange={(e) => setTextImageOptions(prev => ({
                        ...prev,
                        width: parseInt(e.target.value) || 400
                      }))}
                      min="100"
                      max="1200"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="text-height">Height</Label>
                    <Input
                      id="text-height"
                      type="number"
                      value={textImageOptions.height}
                      onChange={(e) => setTextImageOptions(prev => ({
                        ...prev,
                        height: parseInt(e.target.value) || 200
                      }))}
                      min="50"
                      max="800"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="text-font-size">Font Size</Label>
                    <Input
                      id="text-font-size"
                      type="number"
                      value={textImageOptions.fontSize}
                      onChange={(e) => setTextImageOptions(prev => ({
                        ...prev,
                        fontSize: parseInt(e.target.value) || 24
                      }))}
                      min="8"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="text-bg-color">Background</Label>
                    <Input
                      id="text-bg-color"
                      type="color"
                      value={textImageOptions.backgroundColor}
                      onChange={(e) => setTextImageOptions(prev => ({
                        ...prev,
                        backgroundColor: e.target.value
                      }))}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => textToImageMutation.mutate()}
                  disabled={textToImageMutation.isPending || !textToImageText.trim()}
                  className="w-full"
                >
                  {textToImageMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Converting Text...</>
                  ) : (
                    <><FileImage className="w-4 h-4 mr-2" /> Convert to Image</>
                  )}
                </Button>

                {generatedTextImageUrl && (
                  <div className="border rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">Chinese API</Badge>
                      <Badge variant="outline">{textImageOptions.width}×{textImageOptions.height}</Badge>
                      <Badge variant="outline">{textToImageStyle}</Badge>
                    </div>
                    <img 
                      src={generatedTextImageUrl} 
                      alt="Generated text image"
                      className="w-full max-w-md mx-auto rounded border"
                    />
                    <Button 
                      className="w-full mt-2"
                      onClick={() => window.open(generatedTextImageUrl, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Image
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chinese Text to Image/PDF (Serverless Export) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  Chinese Text ➜ Image/PDF
                </CardTitle>
                <CardDescription>
                  Render Chinese text to a PNG image using embedded Noto Sans TC, or batch to a PDF (one text per page).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="chinese-text-input">Chinese Text (one or multiple lines)</Label>
                  <Textarea
                    id="chinese-text-input"
                    placeholder="输入中文文本，例如：&#10;你好&#10;再见&#10;小鸟&#10;&#10;Each line will become a separate page in PDF mode."
                    value={chineseText}
                    onChange={(e) => setChineseText(e.target.value)}
                    className="min-h-[100px] text-lg"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="cn-width">Width (px)</Label>
                    <Input
                      id="cn-width"
                      type="number"
                      value={cnOptions.width}
                      onChange={(e) => setCnOptions(prev => ({
                        ...prev,
                        width: parseInt(e.target.value) || 600
                      }))}
                      min="200"
                      max="1200"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cn-height">Height (px)</Label>
                    <Input
                      id="cn-height"
                      type="number"
                      value={cnOptions.height}
                      onChange={(e) => setCnOptions(prev => ({
                        ...prev,
                        height: parseInt(e.target.value) || 180
                      }))}
                      min="80"
                      max="600"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cn-font-size">Font Size</Label>
                    <Input
                      id="cn-font-size"
                      type="number"
                      value={cnOptions.fontSize}
                      onChange={(e) => setCnOptions(prev => ({
                        ...prev,
                        fontSize: parseInt(e.target.value) || 64
                      }))}
                      min="16"
                      max="200"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cn-bg-color">Background</Label>
                    <Input
                      id="cn-bg-color"
                      type="color"
                      value={cnOptions.backgroundColor}
                      onChange={(e) => setCnOptions(prev => ({
                        ...prev,
                        backgroundColor: e.target.value
                      }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => chineseTextToImageMutation.mutate()}
                    disabled={chineseTextToImageMutation.isPending || !chineseText.trim()}
                    className="flex-1"
                  >
                    {chineseTextToImageMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating PNG...</>
                    ) : (
                      <><FileImage className="w-4 h-4 mr-2" /> Generate PNG</>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => chineseTextToPDFMutation.mutate()}
                    disabled={chineseTextToPDFMutation.isPending || !chineseText.trim()}
                    className="flex-1"
                    variant="outline"
                  >
                    {chineseTextToPDFMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating PDF...</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" /> Generate PDF</>
                    )}
                  </Button>
                </div>

                {chineseTextImageUrl && (
                  <div className="border rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">Noto Sans TC</Badge>
                      <Badge variant="outline">{cnOptions.width}×{cnOptions.height}</Badge>
                      <Badge variant="outline">{cnOptions.fontSize}px</Badge>
                    </div>
                    <img 
                      src={chineseTextImageUrl} 
                      alt="Generated Chinese text image"
                      className="w-full max-w-md mx-auto rounded border"
                    />
                    <Button 
                      className="w-full mt-2"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = chineseTextImageUrl;
                        a.download = `chinese-text-${Date.now()}.png`;
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PNG Image
                    </Button>
                  </div>
                )}

                <div className="text-sm bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="font-medium text-blue-900">🎯 Features:</div>
                  <div className="text-blue-700 text-xs mt-1">
                    • <strong>PNG Mode:</strong> Renders first line of text as a high-quality PNG image
                    <br />
                    • <strong>PDF Mode:</strong> Each line becomes a separate page in a multi-page PDF
                    <br />
                    • <strong>Font:</strong> Uses embedded Noto Sans TC for perfect Chinese character rendering
                    <br />
                    • <strong>Serverless:</strong> Works offline and in serverless environments
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Translation Tool */}
          <TabsContent value="translate">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Language Translator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="translate-from">From Language</Label>
                    <select 
                      id="translate-from"
                      className="w-full mt-1 p-2 border rounded"
                      value={translationFrom}
                      onChange={(e) => setTranslationFrom(e.target.value)}
                    >
                      <option value="chinese">Chinese</option>
                      <option value="vietnamese">Vietnamese</option>
                      <option value="english">English</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="translate-to">To Language</Label>
                    <select 
                      id="translate-to"
                      className="w-full mt-1 p-2 border rounded"
                      value={translationTo}
                      onChange={(e) => setTranslationTo(e.target.value)}
                    >
                      <option value="vietnamese">Vietnamese</option>
                      <option value="chinese">Chinese</option>
                      <option value="english">English</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="translation-text">Text to Translate</Label>
                  <Textarea
                    id="translation-text"
                    placeholder="Enter text to translate..."
                    value={translationText}
                    onChange={(e) => setTranslationText(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={() => translationMutation.mutate()}
                  disabled={translationMutation.isPending || !translationText.trim()}
                  className="w-full"
                >
                  {translationMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Translating...</>
                  ) : (
                    <><Languages className="w-4 h-4 mr-2" /> Translate</>
                  )}
                </Button>

                {translationResult && (
                  <div className="border rounded p-4 bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Translation Result</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(translationResult, 'translate')}
                      >
                        {copiedStates.translate ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-lg">{translationResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vocabulary Extraction Tool */}
          <TabsContent value="vocabulary">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Vocabulary Extractor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="vocabulary-level">Education Level</Label>
                  <select 
                    id="vocabulary-level"
                    className="w-full mt-1 p-2 border rounded"
                    value={vocabularyLevel}
                    onChange={(e) => setVocabularyLevel(e.target.value)}
                  >
                    <option value="preschool">Preschool</option>
                    <option value="primary">Primary</option>
                    <option value="secondary">Lower Secondary</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="vocabulary-text">Text Content</Label>
                  <Textarea
                    id="vocabulary-text"
                    placeholder="Enter lesson text to extract vocabulary..."
                    className="min-h-32"
                    value={vocabularyText}
                    onChange={(e) => setVocabularyText(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={() => vocabularyMutation.mutate()}
                  disabled={vocabularyMutation.isPending || !vocabularyText.trim()}
                  className="w-full"
                >
                  {vocabularyMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting...</>
                  ) : (
                    <><BookOpen className="w-4 h-4 mr-2" /> Extract Vocabulary</>
                  )}
                </Button>

                {extractedVocabulary.length > 0 && (
                  <div className="border rounded p-4 bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Extracted Vocabulary ({extractedVocabulary.length} words)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(extractedVocabulary.join(', '), 'vocabulary')}
                      >
                        {copiedStates.vocabulary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {extractedVocabulary.map((word, index) => (
                        <span key={index} className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Text-to-Speech Tool */}
          <TabsContent value="audio">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Text-to-Speech
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tts-language">Language</Label>
                  <select 
                    id="tts-language"
                    className="w-full mt-1 p-2 border rounded"
                    value={ttsLanguage}
                    onChange={(e) => setTtsLanguage(e.target.value)}
                  >
                    <option value="zh-CN">Chinese (Mandarin)</option>
                    <option value="vi-VN">Vietnamese</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="tts-text">Text to Convert</Label>
                  <Textarea
                    id="tts-text"
                    placeholder="Enter text to convert to speech..."
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={() => ttsMutation.mutate()}
                  disabled={ttsMutation.isPending || !ttsText.trim()}
                  className="w-full"
                >
                  {ttsMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Audio...</>
                  ) : (
                    <><Volume2 className="w-4 h-4 mr-2" /> Generate Audio</>
                  )}
                </Button>

                {audioUrl && (
                  <div className="border rounded p-4">
                    <Label className="block mb-2">Generated Audio</Label>
                    <audio controls className="w-full">
                      <source src={audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flashcard Creator Tool */}
          <TabsContent value="flashcards">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  Custom Flashcard Creator
                </CardTitle>
                <CardDescription>
                  Create custom flashcards with images and text, then generate PDF for printing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Flashcard Input Form */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="flashcard-type">Content Type</Label>
                      <select 
                        id="flashcard-type"
                        className="w-full mt-1 p-2 border rounded"
                        value={currentType}
                        onChange={(e) => setCurrentType(e.target.value as 'text' | 'image')}
                      >
                        <option value="text">Text Only</option>
                        <option value="image">Image</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="chinese-word">Chinese Word</Label>
                        <Input
                          id="chinese-word"
                          placeholder="例: 小鸟"
                          value={currentChineseWord}
                          onChange={(e) => setCurrentChineseWord(e.target.value)}
                          className="text-lg"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pinyin">Pinyin</Label>
                        <Input
                          id="pinyin"
                          placeholder="例: xiǎo niǎo"
                          value={currentPinyin}
                          onChange={(e) => setCurrentPinyin(e.target.value)}
                        />
                      </div>
                    </div>

                    {currentType === 'image' ? (
                      <div>
                        <Label htmlFor="flashcard-image">Upload Image</Label>
                        <Input
                          id="flashcard-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="mt-1"
                        />
                        {currentImageFile && (
                          <div className="mt-2 p-2 border rounded bg-muted/50">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              <span className="text-sm">{currentImageFile.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="text-content">Text Content</Label>
                        <Textarea
                          id="text-content"
                          placeholder="Enter descriptive text for this flashcard..."
                          value={currentContent}
                          onChange={(e) => setCurrentContent(e.target.value)}
                          className="min-h-20"
                        />
                      </div>
                    )}

                    <Button 
                      onClick={addFlashcardItem}
                      disabled={!currentChineseWord.trim() || !currentPinyin.trim() || 
                        (currentType === 'image' && !currentImageFile) ||
                        (currentType === 'text' && !currentContent.trim())}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Flashcard
                    </Button>
                  </div>

                  {/* Preview & List */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center">
                        <Label>Flashcards Collection ({flashcardItems.length} cards, {flashcardItems.length * 2} pages)</Label>
                        {flashcardItems.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFlashcards}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto border rounded-lg">
                        {flashcardItems.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <div className="mb-2">No flashcards added yet</div>
                            <div className="text-xs">Add multiple flashcards to create one PDF with all cards</div>
                          </div>
                        ) : (
                          <div className="space-y-2 p-2">
                            {flashcardItems.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 p-3 border rounded bg-background">
                                <div className="flex-1">
                                  <div className="font-medium text-lg">{item.chineseWord}</div>
                                  <div className="text-sm text-muted-foreground">{item.pinyin}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {item.type === 'image' ? (
                                      <span className="flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        {item.content}
                                      </span>
                                    ) : (
                                      <span>{item.content}</span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFlashcardItem(item.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {flashcardItems.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-sm bg-blue-50 border border-blue-200 rounded p-3">
                          <div className="font-medium text-blue-900">📄 PDF Output:</div>
                          <div className="text-blue-700 text-xs mt-1">
                            • {flashcardItems.length} flashcard{flashcardItems.length !== 1 ? 's' : ''} = {flashcardItems.length * 2} pages total
                            <br />
                            • Each card has front side (Chinese + content) and back side (Chinese + pinyin)
                            <br />
                            • All cards will be combined into one PDF file
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => flashcardPDFMutation.mutate()}
                          disabled={flashcardPDFMutation.isPending}
                          className="w-full"
                          size="lg"
                        >
                          {flashcardPDFMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating PDF with {flashcardItems.length} cards...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Generate PDF ({flashcardItems.length} cards, {flashcardItems.length * 2} pages)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">📋 Instructions:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li><strong>Add Multiple Cards:</strong> Create as many flashcards as you want - they'll all be in one PDF</li>
                    <li><strong>Chinese & Pinyin:</strong> Enter Chinese characters and their pinyin pronunciation</li>
                    <li><strong>Content Options:</strong> Choose text description OR upload an image for each card</li>
                    <li><strong>PDF Layout:</strong> Each flashcard = 2 pages (front: Chinese + content, back: Chinese + pinyin)</li>
                    <li><strong>Perfect for Printing:</strong> Print, cut along lines, and fold for physical flashcards</li>
                    <li><strong>Batch Processing:</strong> All your flashcards will be combined into one convenient PDF file</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lesson Analysis Tool */}
          <TabsContent value="analyze">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  Content Analyzer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="analysis-text">Lesson Content</Label>
                  <Textarea
                    id="analysis-text"
                    placeholder="Enter lesson content to analyze..."
                    className="min-h-32"
                    value={analysisText}
                    onChange={(e) => setAnalysisText(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={() => analysisMutation.mutate()}
                  disabled={analysisMutation.isPending || !analysisText.trim()}
                  className="w-full"
                >
                  {analysisMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><FileImage className="w-4 h-4 mr-2" /> Analyze Content</>
                  )}
                </Button>

                {analysisResult && (
                  <div className="border rounded p-4 bg-muted/50 space-y-3">
                    <div>
                      <Label className="font-medium">Detected Level:</Label>
                      <p className="text-sm">{analysisResult.detectedLevel} - {analysisResult.ageAppropriate}</p>
                    </div>
                    
                    <div>
                      <Label className="font-medium">Main Theme:</Label>
                      <p className="text-sm">{analysisResult.mainTheme}</p>
                    </div>
                    
                    <div>
                      <Label className="font-medium">Duration:</Label>
                      <p className="text-sm">{analysisResult.duration}</p>
                    </div>
                    
                    <div>
                      <Label className="font-medium">Key Vocabulary:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResult.vocabulary?.map((word: string, index: number) => (
                          <span key={index} className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="font-medium">Learning Objectives:</Label>
                      <ul className="text-sm list-disc list-inside mt-1">
                        {analysisResult.learningObjectives?.map((objective: string, index: number) => (
                          <li key={index}>{objective}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Speech to Text Tool */}
          <TabsContent value="speech">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Speech to Text
                </CardTitle>
                <CardDescription>
                  Convert spoken audio to text for lesson planning and content creation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Method Selection */}
                <div className="flex justify-center space-x-4">
                  <Button
                    variant={uploadMethod === "upload" ? "default" : "outline"}
                    onClick={() => setUploadMethod("upload")}
                    className="flex items-center gap-2"
                  >
                    <FileAudio className="w-4 h-4" />
                    Upload Audio File
                  </Button>
                  <Button
                    variant={uploadMethod === "record" ? "default" : "outline"}
                    onClick={() => setUploadMethod("record")}
                    className="flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    Record Audio
                  </Button>
                </div>

                {/* File Upload Section */}
                {uploadMethod === "upload" && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <FileAudio className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <Label htmlFor="audio-upload" className="cursor-pointer">
                          <div className="text-sm font-medium">Click to upload audio file</div>
                          <div className="text-xs text-muted-foreground">
                            Supports MP3, WAV, M4A, and other audio formats
                          </div>
                        </Label>
                        <Input
                          id="audio-upload"
                          type="file"
                          accept="audio/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                    
                    {audioFile && (
                      <div className="space-y-3">
                        <Label>Selected Audio File</Label>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <FileAudio className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{audioFile.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                            </div>
                          </div>
                          <Button
                            onClick={() => speechToTextMutation.mutate()}
                            disabled={speechToTextMutation.isPending}
                            size="sm"
                          >
                            {speechToTextMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              'Transcribe'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recording Section */}
                {uploadMethod === "record" && (
                  <div className="text-center space-y-4">
                    <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isRecording ? 'bg-red-100 animate-pulse' : 'bg-muted'
                    }`}>
                      <Mic className={`w-8 h-8 ${isRecording ? 'text-red-500' : 'text-muted-foreground'}`} />
                    </div>
                    
                    <div>
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-32 ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
                        disabled={speechToTextMutation.isPending}
                      >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                      </Button>
                      {isRecording && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Recording... Click stop when finished
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Audio Preview for Recording */}
                {uploadMethod === "record" && audioBlob && !isRecording && (
                  <div className="space-y-3">
                    <Label>Recorded Audio</Label>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <audio 
                        controls 
                        src={URL.createObjectURL(audioBlob)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => speechToTextMutation.mutate()}
                        disabled={speechToTextMutation.isPending}
                        size="sm"
                      >
                        {speechToTextMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Transcribe'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Transcription Result */}
                {transcription && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Transcription Result</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(transcription)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      className="min-h-[120px]"
                      placeholder="Transcription will appear here..."
                    />
                  </div>
                )}

                {/* Language Support Info */}
                <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border">
                  <p className="font-medium mb-1">Supported Languages:</p>
                  <p>Chinese (Mandarin), Vietnamese, English, and 50+ other languages</p>
                  <p className="mt-1">Best results with clear audio and minimal background noise</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompt Optimization Tool */}
          <TabsContent value="prompt">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  AI Prompt Optimizer
                </CardTitle>
                <CardDescription>
                  Improve your AI prompts for better, more consistent results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prompt-purpose">Prompt Purpose</Label>
                    <select 
                      id="prompt-purpose"
                      className="w-full mt-1 p-2 border rounded"
                      value={promptPurpose}
                      onChange={(e) => setPromptPurpose(e.target.value)}
                    >
                      <option value="general">General Use</option>
                      <option value="educational">Educational Content</option>
                      <option value="creative">Creative Writing</option>
                      <option value="analysis">Text Analysis</option>
                      <option value="translation">Translation</option>
                      <option value="coding">Code Generation</option>
                      <option value="lesson-planning">Lesson Planning</option>
                      <option value="vocabulary">Vocabulary Learning</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="original-prompt">Original Prompt</Label>
                  <Textarea
                    id="original-prompt"
                    placeholder="Enter your current prompt here..."
                    value={originalPrompt}
                    onChange={(e) => setOriginalPrompt(e.target.value)}
                    className="min-h-[120px] mt-1"
                  />
                </div>

                <Button 
                  onClick={() => promptOptimizeMutation.mutate()}
                  disabled={promptOptimizeMutation.isPending || !originalPrompt.trim()}
                  className="w-full"
                >
                  {promptOptimizeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Optimize Prompt
                    </>
                  )}
                </Button>

                {optimizedPrompt && (
                  <div className="space-y-4 mt-6">
                    <div>
                      <Label className="font-medium">Optimized Prompt:</Label>
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm">{optimizedPrompt}</pre>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => navigator.clipboard.writeText(optimizedPrompt)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Optimized Prompt
                      </Button>
                    </div>

                    {promptImprovement && (
                      <div className="space-y-3">
                        <Label className="font-medium">Improvements Made:</Label>
                        <div className="space-y-2">
                          {promptImprovement.improvements?.map((improvement: string, index: number) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{improvement}</span>
                            </div>
                          ))}
                        </div>

                        {promptImprovement.tips && (
                          <div>
                            <Label className="font-medium">Additional Tips:</Label>
                            <ul className="text-sm list-disc list-inside mt-1 space-y-1">
                              {promptImprovement.tips.map((tip: string, index: number) => (
                                <li key={index}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Useful Links Tab */}
          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Useful Educational Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Translation & Language Tools */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">🌐 Translation & Language Tools</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <a href="https://translate.google.com" target="_blank" rel="noopener noreferrer" 
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">🔤</div>
                      <div>
                        <div className="font-medium">Google Translate</div>
                        <div className="text-xs text-muted-foreground">Multi-language translation</div>
                      </div>
                    </a>
                    
                    <a href="https://www.deepl.com/translator" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-purple-100 rounded mr-3 flex items-center justify-center">🧠</div>
                      <div>
                        <div className="font-medium">DeepL Translator</div>
                        <div className="text-xs text-muted-foreground">Advanced AI translation</div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* AI Assistants */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">🤖 AI Assistants</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-green-100 rounded mr-3 flex items-center justify-center">💬</div>
                      <div>
                        <div className="font-medium">ChatGPT</div>
                        <div className="text-xs text-muted-foreground">OpenAI's conversational AI</div>
                      </div>
                    </a>
                    
                    <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">✨</div>
                      <div>
                        <div className="font-medium">Google Gemini</div>
                        <div className="text-xs text-muted-foreground">Google's multimodal AI</div>
                      </div>
                    </a>
                    
                    <a href="https://claude.ai" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-orange-100 rounded mr-3 flex items-center justify-center">🧑‍💼</div>
                      <div>
                        <div className="font-medium">Claude</div>
                        <div className="text-xs text-muted-foreground">Anthropic's helpful AI</div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Image Resources */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">🖼️ Image Resources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-gray-100 rounded mr-3 flex items-center justify-center">📸</div>
                      <div>
                        <div className="font-medium">Unsplash</div>
                        <div className="text-xs text-muted-foreground">Free high-quality photos</div>
                      </div>
                    </a>
                    
                    <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-teal-100 rounded mr-3 flex items-center justify-center">🎨</div>
                      <div>
                        <div className="font-medium">Pexels</div>
                        <div className="text-xs text-muted-foreground">Free stock photos & videos</div>
                      </div>
                    </a>
                    
                    <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-green-100 rounded mr-3 flex items-center justify-center">🌈</div>
                      <div>
                        <div className="font-medium">Pixabay</div>
                        <div className="text-xs text-muted-foreground">Free images & illustrations</div>
                      </div>
                    </a>

                    <a href="https://images.google.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">🔍</div>
                      <div>
                        <div className="font-medium">Google Images</div>
                        <div className="text-xs text-muted-foreground">Comprehensive image search</div>
                      </div>
                    </a>

                    <a href="https://www.freepik.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-pink-100 rounded mr-3 flex items-center justify-center">🎭</div>
                      <div>
                        <div className="font-medium">Freepik</div>
                        <div className="text-xs text-muted-foreground">Vectors & illustrations</div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Document Tools */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">📄 Document & Presentation Tools</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <a href="https://dillinger.io" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-indigo-100 rounded mr-3 flex items-center justify-center">👁️</div>
                      <div>
                        <div className="font-medium">Dillinger</div>
                        <div className="text-xs text-muted-foreground">Online Markdown editor</div>
                      </div>
                    </a>
                    
                    <a href="https://www.markdowntopdf.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-red-100 rounded mr-3 flex items-center justify-center">📋</div>
                      <div>
                        <div className="font-medium">Markdown to PDF</div>
                        <div className="text-xs text-muted-foreground">Convert MD to PDF/DOCX</div>
                      </div>
                    </a>
                    
                    <a href="https://www.beautiful.ai" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-purple-100 rounded mr-3 flex items-center justify-center">🎭</div>
                      <div>
                        <div className="font-medium">Beautiful.AI</div>
                        <div className="text-xs text-muted-foreground">AI-powered presentations</div>
                      </div>
                    </a>

                    <a href="https://www.canva.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-cyan-100 rounded mr-3 flex items-center justify-center">🎨</div>
                      <div>
                        <div className="font-medium">Canva</div>
                        <div className="text-xs text-muted-foreground">Design presentations & materials</div>
                      </div>
                    </a>

                    <a href="https://gamma.app" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-violet-100 rounded mr-3 flex items-center justify-center">⚡</div>
                      <div>
                        <div className="font-medium">Gamma</div>
                        <div className="text-xs text-muted-foreground">AI slide generation</div>
                      </div>
                    </a>

                    <a href="https://www.tome.app" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-emerald-100 rounded mr-3 flex items-center justify-center">📖</div>
                      <div>
                        <div className="font-medium">Tome</div>
                        <div className="text-xs text-muted-foreground">AI-powered storytelling & manuscripts</div>
                      </div>
                    </a>

                    <a href="https://www.presentations.ai" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">🎯</div>
                      <div>
                        <div className="font-medium">Presentations.AI</div>
                        <div className="text-xs text-muted-foreground">AI presentation & manuscript maker</div>
                      </div>
                    </a>

                    <a href="https://slidesai.io" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-yellow-100 rounded mr-3 flex items-center justify-center">🤖</div>
                      <div>
                        <div className="font-medium">SlidesAI</div>
                        <div className="text-xs text-muted-foreground">Convert text to slides automatically</div>
                      </div>
                    </a>

                    <a href="https://www.pitch.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-rose-100 rounded mr-3 flex items-center justify-center">💼</div>
                      <div>
                        <div className="font-medium">Pitch</div>
                        <div className="text-xs text-muted-foreground">Collaborative presentation tool</div>
                      </div>
                    </a>

                    <a href="https://manus.im" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-amber-100 rounded mr-3 flex items-center justify-center">📜</div>
                      <div>
                        <div className="font-medium">Manus AI</div>
                        <div className="text-xs text-muted-foreground">AI-powered manuscript & document creation</div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Communication */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">💬 Communication</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">👥</div>
                      <div>
                        <div className="font-medium">Facebook</div>
                        <div className="text-xs text-muted-foreground">Social networking</div>
                      </div>
                    </a>
                    
                    <a href="https://zalo.me" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">💙</div>
                      <div>
                        <div className="font-medium">Zalo</div>
                        <div className="text-xs text-muted-foreground">Vietnamese messaging app</div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Educational Resources */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">📚 Educational Resources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <a href="https://www.flaticon.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-orange-100 rounded mr-3 flex items-center justify-center">🔧</div>
                      <div>
                        <div className="font-medium">Flaticon</div>
                        <div className="text-xs text-muted-foreground">Educational icons & graphics</div>
                      </div>
                    </a>

                    <a href="https://www.storyset.com" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-yellow-100 rounded mr-3 flex items-center justify-center">📖</div>
                      <div>
                        <div className="font-medium">Storyset</div>
                        <div className="text-xs text-muted-foreground">Free educational illustrations</div>
                      </div>
                    </a>

                    <a href="https://undraw.co" target="_blank" rel="noopener noreferrer"
                       className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-indigo-100 rounded mr-3 flex items-center justify-center">✏️</div>
                      <div>
                        <div className="font-medium">unDraw</div>
                        <div className="text-xs text-muted-foreground">Open-source illustrations</div>
                      </div>
                    </a>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Signature */}
        <footer className="mt-8 text-center">
          <p className="text-sm text-muted-foreground italic">
            Thanh Hoàng tặng vợ iu Thu Thảo
          </p>
        </footer>
      </div>
    </div>
  );
}