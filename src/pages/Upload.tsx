import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { AudioEditor } from '@/components/Upload/AudioEditor';
import { HashtagInput } from '@/components/Upload/HashtagInput';
import { YouTubePlayer } from '@/components/YouTube/YouTubePlayer';
import { Upload as UploadIcon, Music, ArrowLeft, Youtube, Link } from 'lucide-react';
import { toast } from 'sonner';
import { extractYouTubeVideoId, isValidYouTubeUrl, getYouTubeThumbnail } from '@/lib/youtube';

type UploadType = 'audio' | 'youtube';

export default function Upload() {
  const navigate = useNavigate();
  const [uploadType, setUploadType] = useState<UploadType>('audio');
  const [step, setStep] = useState<'upload' | 'edit' | 'details'>('upload');
  
  // Audio upload state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [editedAudio, setEditedAudio] = useState<Blob | null>(null);
  const [editMetadata, setEditMetadata] = useState<any>(null);
  
  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeStartSeconds, setYoutubeStartSeconds] = useState(0);
  
  // Common state
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }

    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setStep('edit');
  };

  const handleYoutubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    const videoId = extractYouTubeVideoId(url);
    setYoutubeVideoId(videoId);
    if (videoId) {
      setYoutubeStartSeconds(0);
    }
  };

  const handleYoutubeContinue = () => {
    if (!youtubeVideoId) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }
    setStep('details');
  };

  const handleAudioSave = (blob: Blob, metadata: any) => {
    setEditedAudio(blob);
    setEditMetadata(metadata);
    setStep('details');
  };

  const handleSkipEdit = () => {
    if (audioFile) {
      setEditedAudio(audioFile);
      setStep('details');
    }
  };

  const handleFinalUpload = async () => {
    if (uploadType === 'audio' && (!editedAudio || !title)) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (uploadType === 'youtube' && (!youtubeVideoId || !title)) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please log in to upload');
        navigate('/login');
        return;
      }

      // Check if user is artist
      const { data: artistData } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!artistData) {
        toast.error('Only artists can upload snippets');
        return;
      }

      if (uploadType === 'youtube') {
        // Insert YouTube snippet directly
        const { error: dbError } = await supabase
          .from('snippets')
          .insert({
            artist_id: artistData.id,
            title,
            media_type: 'youtube',
            youtube_video_id: youtubeVideoId,
            youtube_start_seconds: youtubeStartSeconds,
            cover_image_url: getYouTubeThumbnail(youtubeVideoId!, 'high'),
            duration: 30,
            status: 'approved',
            genre: 'other',
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          });

        if (dbError) throw dbError;

        toast.success('YouTube snippet uploaded successfully!');
        navigate('/profile');
        return;
      }

      // Audio upload flow
      const audioFileName = `${Date.now()}_${title.replace(/\s/g, '_')}.wav`;
      const { data: audioUploadData, error: audioError } = await supabase.storage
        .from('snippets')
        .upload(audioFileName, editedAudio!);

      if (audioError) throw audioError;

      // Upload cover if provided
      let coverUrl = null;
      if (coverImage) {
        const coverFileName = `${Date.now()}_cover.${coverImage.name.split('.').pop()}`;
        const { data: coverUploadData, error: coverError } = await supabase.storage
          .from('covers')
          .upload(coverFileName, coverImage);

        if (coverError) throw coverError;

        const { data: coverPublicUrl } = supabase.storage
          .from('covers')
          .getPublicUrl(coverUploadData.path);
        coverUrl = coverPublicUrl.publicUrl;
      }

      const { data: audioPublicUrl } = supabase.storage
        .from('snippets')
        .getPublicUrl(audioUploadData.path);

      // Save original audio URL if edited
      let originalUrl = null;
      if (audioFile && editedAudio !== audioFile) {
        const originalFileName = `${Date.now()}_original.${audioFile.name.split('.').pop()}`;
        const { data: originalUploadData } = await supabase.storage
          .from('snippets')
          .upload(originalFileName, audioFile);

        if (originalUploadData) {
          const { data: origPublicUrl } = supabase.storage
            .from('snippets')
            .getPublicUrl(originalUploadData.path);
          originalUrl = origPublicUrl.publicUrl;
        }
      }

      // Create snippet via edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-snippet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          title,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          hashtags,
          audio_url: audioPublicUrl.publicUrl,
          cover_image_url: coverUrl,
          original_audio_url: originalUrl,
          edited: !!editMetadata,
          edit_metadata: editMetadata,
          duration: Math.round(editMetadata?.originalDuration || 30),
          media_type: 'audio'
        })
      });

      if (!response.ok) throw new Error('Upload failed');

      // Create hashtags and link them
      if (hashtags.length > 0) {
        const snippetId = (await response.json()).id;
        for (const tag of hashtags) {
          const { data: hashtagData } = await supabase
            .from('hashtags')
            .upsert({ tag }, { onConflict: 'tag' })
            .select()
            .single();

          if (hashtagData) {
            await supabase
              .from('snippet_hashtags')
              .insert({ snippet_id: snippetId, hashtag_id: hashtagData.id });
          }
        }
      }

      toast.success('Snippet uploaded successfully!');
      navigate('/profile');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload snippet');
    } finally {
      setUploading(false);
    }
  };

  if (step === 'upload') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-6 w-6" />
              Upload Snippet
            </CardTitle>
            <CardDescription>
              Upload your 30-second audio snippet or share a YouTube clip
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as UploadType)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="audio" className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Upload Audio
                </TabsTrigger>
                <TabsTrigger value="youtube" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube Link
                </TabsTrigger>
              </TabsList>

              <TabsContent value="audio">
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <UploadIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-semibold mb-2">Click to upload audio</p>
                    <p className="text-sm text-muted-foreground">
                      MP3, WAV, or other audio formats (max 30 seconds)
                    </p>
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="youtube" className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="youtube-url">YouTube URL</Label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="youtube-url"
                      value={youtubeUrl}
                      onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste a YouTube video URL - only 30 seconds will be playable
                  </p>
                </div>

                {youtubeVideoId && (
                  <div className="space-y-4">
                    <div className="rounded-lg overflow-hidden">
                      <YouTubePlayer
                        videoId={youtubeVideoId}
                        startSeconds={youtubeStartSeconds}
                        maxDuration={30}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Start Time: {Math.floor(youtubeStartSeconds / 60)}:{(youtubeStartSeconds % 60).toString().padStart(2, '0')}</Label>
                      <Slider
                        value={[youtubeStartSeconds]}
                        onValueChange={([value]) => setYoutubeStartSeconds(value)}
                        min={0}
                        max={300}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Select where the 30-second clip should start (max 5 minutes into video)
                      </p>
                    </div>

                    <Button onClick={handleYoutubeContinue} className="w-full">
                      Continue to Details
                    </Button>
                  </div>
                )}

                {!youtubeVideoId && youtubeUrl && !isValidYouTubeUrl(youtubeUrl) && (
                  <p className="text-sm text-destructive">
                    Please enter a valid YouTube URL
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'edit' && uploadType === 'audio') {
    return (
      <div className="min-h-screen p-4 py-8">
        <div className="max-w-4xl mx-auto">
          <AudioEditor
            audioUrl={audioUrl}
            onSave={handleAudioSave}
            onCancel={() => setStep('upload')}
          />
          <div className="text-center mt-4">
            <Button variant="link" onClick={handleSkipEdit}>
              Skip editing and continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Snippet Details</CardTitle>
            <CardDescription>Add information about your snippet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadType === 'youtube' && youtubeVideoId && (
              <div className="rounded-lg overflow-hidden mb-4">
                <YouTubePlayer
                  videoId={youtubeVideoId}
                  startSeconds={youtubeStartSeconds}
                  maxDuration={30}
                />
              </div>
            )}

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My awesome snippet"
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="hip-hop, beats, trap"
              />
            </div>

            <div>
              <Label>Hashtags</Label>
              <HashtagInput
                hashtags={hashtags}
                onChange={setHashtags}
                maxHashtags={10}
                placeholder="Add hashtags (press Enter)..."
              />
            </div>

            {uploadType === 'audio' && (
              <div>
                <Label htmlFor="cover">Cover Image</Label>
                <Input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(uploadType === 'audio' ? 'edit' : 'upload')}
                className="flex-1"
              >
                {uploadType === 'audio' ? 'Back to Editor' : 'Back'}
              </Button>
              <Button
                onClick={handleFinalUpload}
                disabled={uploading || !title}
                className="flex-1"
              >
                {uploading ? 'Uploading...' : 'Upload Snippet'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
