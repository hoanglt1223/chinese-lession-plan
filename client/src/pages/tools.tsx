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
  FileAudio
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Tools() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

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

  // Global AI Settings
  const [aiModel, setAiModel] = useState("gpt-5-nano");
  const [outputLanguage, setOutputLanguage] = useState("auto");

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
        formData.append('aiModel', aiModel);
        formData.append('outputLanguage', outputLanguage);
        
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
            aiModel,
            outputLanguage
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
          aiModel,
          outputLanguage
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
          aiModel,
          outputLanguage
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
          aiModel,
          outputLanguage
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
          aiModel,
          outputLanguage
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
          aiModel,
          outputLanguage
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
      formData.append('language', outputLanguage);

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
                    <span className="sm:hidden">${user.creditBalance.split('.')[0]}</span>
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

      {/* Mobile AI Settings */}
      <div className="lg:hidden border-b bg-background">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2 text-sm">
              <select 
                className="p-1 border rounded text-xs bg-background"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
              >
                <option value="gpt-5-nano">GPT-5-nano</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o-mini</option>
              </select>
              <select 
                className="p-1 border rounded text-xs bg-background"
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="chinese">中文</option>
                <option value="vietnamese">Tiếng Việt</option>
                <option value="english">English</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-2 sm:p-4 lg:p-8">
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl lg:text-3xl font-bold text-foreground mb-2">AI Teaching Tools</h2>
              <p className="text-sm lg:text-base text-muted-foreground">
                Standalone tools to enhance your Chinese language teaching workflow
              </p>
            </div>
            
            {/* Desktop AI Settings */}
            <Card className="w-full lg:w-80 hidden lg:block">
              <CardContent className="p-4">
                <Label className="text-sm font-medium mb-3 block">AI Settings</Label>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="ai-model" className="text-xs">AI Model</Label>
                    <select 
                      id="ai-model"
                      className="w-full mt-1 p-2 text-sm border rounded"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                    >
                      <option value="gpt-5-nano">GPT-5-nano (Fast & Efficient)</option>
                      <option value="gpt-4o">GPT-4o (Most Capable)</option>
                      <option value="gpt-4o-mini">GPT-4o-mini (Balanced)</option>
                      <option value="gpt-3.5-turbo">GPT-3.5-turbo (Budget)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="output-language" className="text-xs">Output Language</Label>
                    <select 
                      id="output-language"
                      className="w-full mt-1 p-2 text-sm border rounded"
                      value={outputLanguage}
                      onChange={(e) => setOutputLanguage(e.target.value)}
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="chinese">Chinese (中文)</option>
                      <option value="vietnamese">Vietnamese (Tiếng Việt)</option>
                      <option value="english">English</option>
                      <option value="bilingual">Bilingual (Chinese + Vietnamese)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
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

          {/* Image Generation Tool */}
          <TabsContent value="image">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  AI Image Generator
                </CardTitle>
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