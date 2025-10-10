import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Upload as UploadIcon, Image as ImageIcon, Music, Loader2, X, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ValidationErrors {
  title?: string;
  audio?: string;
  coverImage?: string;
}

export default function Upload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const validateTitle = (value: string): string | undefined => {
    if (!value.trim()) return 'Title is required';
    if (value.length > 80) return 'Title must be 80 characters or less';
    return undefined;
  };

  const validateAudioFile = async (file: File): Promise<string | undefined> => {
    // Check file type
    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      return 'Audio must be an MP3 file';
    }

    // Check file size (20 MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return `Audio must be 20 MB or less (yours is ${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    }

    // Check duration using Web Audio API
    try {
      const duration = await getAudioDuration(file);
      setAudioDuration(duration);
      
      if (duration > 30.0) {
        return `Audio must be 30s or less (yours is ~${duration.toFixed(1)}s)`;
      }
    } catch (error) {
      console.error('Error reading audio duration:', error);
      return 'Could not read audio file metadata';
    }

    return undefined;
  };

  const validateCoverImage = (file: File): string | undefined => {
    // Check file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Cover image must be PNG, JPEG, or WebP';
    }

    // Check file size (5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return `Image must be 5 MB or less (yours is ${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    }

    return undefined;
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load audio'));
      });
      
      audio.src = objectUrl;
    });
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const error = validateTitle(value);
    setErrors(prev => ({ ...prev, title: error }));
  };

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setErrors(prev => ({ ...prev, audio: 'Validating audio file...' }));
    
    const error = await validateAudioFile(file);
    setErrors(prev => ({ ...prev, audio: error }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateCoverImage(file);
    setErrors(prev => ({ ...prev, coverImage: error }));

    if (!error) {
      setCoverFile(file);
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCoverFile(null);
      setCoverPreview('');
    }
  };

  const isFormValid = (): boolean => {
    return (
      title.trim().length > 0 &&
      title.length <= 80 &&
      audioFile !== null &&
      coverFile !== null &&
      !errors.title &&
      !errors.audio &&
      !errors.coverImage &&
      audioDuration !== null &&
      audioDuration <= 30.0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid() || !audioFile || !coverFile) {
      toast({
        title: 'Validation Error',
        description: 'Please fix all errors before uploading',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Create abort controller for cancellation
    const abortController = new AbortController();
    setUploadAbortController(abortController);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Create form data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('audio', audioFile);
      formData.append('coverImage', coverFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Call upload endpoint with abort signal
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-snippet`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
          signal: abortController.signal,
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);

      if (!result.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Announce success to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.className = 'sr-only';
      announcement.textContent = 'Upload complete';
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);

      toast({
        title: 'Snippet uploaded successfully!',
        description: `"${result.title}" is now live in the feed.`,
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate('/feed')}>
            View in Feed
          </Button>
        ),
      });

      // Navigate to feed after a short delay
      setTimeout(() => navigate('/feed'), 1500);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: 'Upload Cancelled',
          description: 'Your upload has been cancelled.',
        });
      } else {
        console.error('Upload error:', error);
        toast({
          title: 'Upload Failed',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      setUploadAbortController(null);
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
      setShowCancelDialog(false);
    }
  };

  const handleResetConfirm = () => {
    setTitle('');
    setAudioFile(null);
    setCoverFile(null);
    setCoverPreview('');
    setAudioDuration(null);
    setErrors({});
    setUploadProgress(0);
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
    setShowResetDialog(false);
    
    toast({
      title: 'Form Reset',
      description: 'All fields have been cleared.',
    });
  };

  const getUploadButtonTooltip = () => {
    if (!title.trim()) return 'Enter a title to continue';
    if (!audioFile) return 'Select a 30-second MP3 to continue';
    if (!coverFile) return 'Select a cover image to continue';
    if (errors.title) return errors.title;
    if (errors.audio) return errors.audio;
    if (errors.coverImage) return errors.coverImage;
    return 'Click to upload your snippet';
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="w-6 h-6" />
              Upload Snippet
            </CardTitle>
            <CardDescription>
              Share your 30-second music snippet with the world
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title Input */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter snippet title"
                  maxLength={80}
                  aria-describedby="title-help title-error"
                  aria-invalid={!!errors.title}
                  disabled={isUploading}
                />
                <p id="title-help" className="text-sm text-muted-foreground">
                  {title.length}/80 characters
                </p>
                {errors.title && (
                  <p id="title-error" className="text-sm text-destructive" role="alert">
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Audio Input */}
              <div className="space-y-2">
                <Label htmlFor="audio">
                  Audio File (MP3) <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    <Music className="w-4 h-4 mr-2" />
                    {audioFile ? audioFile.name : 'Choose MP3 file'}
                  </Button>
                  <Input
                    ref={audioInputRef}
                    id="audio"
                    type="file"
                    accept=".mp3,audio/mpeg"
                    onChange={handleAudioChange}
                    className="hidden"
                    aria-describedby="audio-help audio-error"
                    aria-invalid={!!errors.audio}
                  />
                </div>
                <p id="audio-help" className="text-sm text-muted-foreground">
                  Maximum 30 seconds, 20 MB limit
                </p>
                {audioDuration !== null && !errors.audio && (
                  <p className="text-sm text-green-600">
                    ✓ Duration: {audioDuration.toFixed(1)}s
                  </p>
                )}
                {errors.audio && (
                  <p id="audio-error" className="text-sm text-destructive" role="alert">
                    {errors.audio}
                  </p>
                )}
              </div>

              {/* Cover Image Input */}
              <div className="space-y-2">
                <Label htmlFor="cover">
                  Cover Image <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {coverFile ? coverFile.name : 'Choose image'}
                    </Button>
                    <Input
                      ref={coverInputRef}
                      id="cover"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                      onChange={handleCoverChange}
                      className="hidden"
                      aria-describedby="cover-help cover-error"
                      aria-invalid={!!errors.coverImage}
                    />
                    <p id="cover-help" className="text-sm text-muted-foreground">
                      PNG, JPEG, or WebP - 5 MB limit
                    </p>
                    {errors.coverImage && (
                      <p id="cover-error" className="text-sm text-destructive" role="alert">
                        {errors.coverImage}
                      </p>
                    )}
                  </div>
                  
                  {/* Image Preview */}
                  {coverPreview && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-border">
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2" role="status" aria-live="polite">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1">
                        <Button
                          type="submit"
                          disabled={!isFormValid() || isUploading}
                          className="w-full"
                          variant="gradient"
                          aria-label="Upload snippet"
                          aria-disabled={!isFormValid() || isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <UploadIcon className="w-4 h-4" />
                              Upload Snippet
                            </>
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {(!isFormValid() || isUploading) && (
                      <TooltipContent>
                        <p>{getUploadButtonTooltip()}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {isUploading ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    aria-label="Cancel upload"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowResetDialog(true)}
                    disabled={!title && !audioFile && !coverFile}
                    aria-label="Reset form"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Cancel Upload Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel current upload?</AlertDialogTitle>
              <AlertDialogDescription>
                This will stop the upload process. Your files will remain selected in the form.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, continue upload</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelUpload} className="bg-destructive hover:bg-destructive/90">
                Yes, cancel upload
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset Form Confirmation Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all fields?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all your inputs, including selected files and the image preview.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, keep my work</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetConfirm}>
                Yes, reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
