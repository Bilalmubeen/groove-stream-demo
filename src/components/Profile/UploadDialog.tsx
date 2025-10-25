import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload as UploadIcon, Image as ImageIcon, Music, Loader2, X, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UploadDialog({ open, onOpenChange, onSuccess }: UploadDialogProps) {
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
    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      return 'Audio must be an MP3 file';
    }
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return `Audio must be 20 MB or less (yours is ${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    }
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
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Cover image must be PNG, JPEG, or WebP';
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return `Image must be 5 MB or less (yours is ${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    }
    return undefined;
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', reject);
      audio.src = URL.createObjectURL(file);
    });
  };

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = await validateAudioFile(file);
    setErrors(prev => ({ ...prev, audio: error }));
    if (!error) {
      setAudioFile(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateCoverImage(file);
    setErrors(prev => ({ ...prev, coverImage: error }));
    if (!error) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const isFormValid = (): boolean => {
    const titleError = validateTitle(title);
    return !titleError && !!audioFile && !!coverFile && !errors.audio && !errors.coverImage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsUploading(true);
    setUploadProgress(0);

    const abortController = new AbortController();
    setUploadAbortController(abortController);

    try {
      // Get auth token for secure upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('audio', audioFile!);
      formData.append('coverImage', coverFile!);

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-snippet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
        signal: abortController.signal,
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast({
        title: 'Snippet uploaded successfully',
        description: `"${result.title}" is now pending approval.`,
      });

      handleResetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: 'Upload cancelled',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Upload failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadAbortController(null);
    }
  };

  const handleCancelUpload = () => {
    uploadAbortController?.abort();
    setShowCancelDialog(false);
  };

  const handleResetForm = () => {
    setTitle('');
    setAudioFile(null);
    setCoverFile(null);
    setCoverPreview('');
    setAudioDuration(null);
    setErrors({});
    setUploadProgress(0);
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleResetConfirm = () => {
    handleResetForm();
    setShowResetDialog(false);
  };

  const getUploadButtonTooltip = () => {
    if (!title.trim()) return 'Enter a title to continue';
    if (!audioFile) return 'Select a 30-second MP3 to continue';
    if (!coverFile) return 'Select a cover image to continue';
    if (errors.audio) return errors.audio;
    if (errors.coverImage) return errors.coverImage;
    return '';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Snippet</DialogTitle>
            <DialogDescription>
              Upload a 30-second MP3 and cover image. All uploads are reviewed before going live.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors(prev => ({ ...prev, title: validateTitle(e.target.value) }));
                }}
                placeholder="Enter snippet title (max 80 characters)"
                maxLength={80}
                aria-describedby="title-helper"
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className="text-sm text-destructive" role="alert">{errors.title}</p>
              )}
              <p id="title-helper" className="text-xs text-muted-foreground">
                {title.length}/80 characters
              </p>
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <Label htmlFor="audio">
                Audio File (MP3, max 30s) <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="audio"
                  ref={audioInputRef}
                  type="file"
                  accept=".mp3,audio/mpeg"
                  onChange={handleAudioChange}
                  aria-describedby="audio-helper"
                  aria-invalid={!!errors.audio}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                  className="w-full justify-start"
                >
                  <Music className="w-4 h-4 mr-2" />
                  {audioFile ? audioFile.name : 'Choose MP3 file'}
                </Button>
              </div>
              {errors.audio && (
                <p className="text-sm text-destructive" role="alert">{errors.audio}</p>
              )}
              {audioFile && audioDuration && (
                <p className="text-xs text-muted-foreground">
                  Duration: {audioDuration.toFixed(1)}s
                </p>
              )}
            </div>

            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="cover">
                Cover Image <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="cover"
                  ref={coverInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  onChange={handleCoverChange}
                  aria-describedby="cover-helper"
                  aria-invalid={!!errors.coverImage}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex-1 justify-start"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {coverFile ? coverFile.name : 'Choose image'}
                </Button>
                {coverPreview && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              {errors.coverImage && (
                <p className="text-sm text-destructive" role="alert">{errors.coverImage}</p>
              )}
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <Button
                        type="submit"
                        variant="gradient"
                        disabled={!isFormValid() || isUploading}
                        className="w-full"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <UploadIcon className="w-4 h-4 mr-2" />
                            Upload Snippet
                          </>
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!isFormValid() && (
                    <TooltipContent>
                      <p>{getUploadButtonTooltip()}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              {isUploading && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => setShowCancelDialog(true)}
                  aria-label="Cancel upload"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}

              {!isUploading && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowResetDialog(true)}
                  aria-label="Reset form"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel upload?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the current upload. Your selected files will remain in the form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, continue upload</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelUpload}>Yes, cancel upload</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all fields?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all form fields and selected files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetConfirm}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
