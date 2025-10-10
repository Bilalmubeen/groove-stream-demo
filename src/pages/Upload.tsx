import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Upload as UploadIcon, Image as ImageIcon, Music } from 'lucide-react';

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

      // Call upload endpoint
      const response = await supabase.functions.invoke('upload-snippet', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.error) {
        throw new Error(response.error.message || 'Upload failed');
      }

      const result = response.data;

      if (!result.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast({
        title: 'Upload Successful!',
        description: `"${result.title}" has been uploaded and is now live in the feed.`,
      });

      // Navigate to feed
      navigate('/feed');

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
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
                <Button
                  type="submit"
                  disabled={!isFormValid() || isUploading}
                  className="flex-1"
                >
                  {isUploading ? 'Uploading...' : 'Upload Snippet'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isUploading}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
