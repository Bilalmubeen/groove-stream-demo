import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AudioEditor } from '@/components/Upload/AudioEditor';
import { Upload as UploadIcon, Music, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Upload() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'upload' | 'edit' | 'details'>('upload');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [editedAudio, setEditedAudio] = useState<Blob | null>(null);
  const [editMetadata, setEditMetadata] = useState<any>(null);
  
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
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
    if (!editedAudio || !title) {
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

      // Upload audio file
      const audioFileName = `${Date.now()}_${title.replace(/\s/g, '_')}.wav`;
      const { data: audioUploadData, error: audioError } = await supabase.storage
        .from('snippets')
        .upload(audioFileName, editedAudio);

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
          audio_url: audioPublicUrl.publicUrl,
          cover_image_url: coverUrl,
          original_audio_url: originalUrl,
          edited: !!editMetadata,
          edit_metadata: editMetadata,
          duration: Math.round(editMetadata?.originalDuration || 30)
        })
      });

      if (!response.ok) throw new Error('Upload failed');

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
              Upload your 30-second audio snippet and customize it with our editor
            </CardDescription>
          </CardHeader>
          <CardContent>
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
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
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

  if (step === 'edit') {
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
              <Label htmlFor="cover">Cover Image</Label>
              <Input
                id="cover"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('edit')}
                className="flex-1"
              >
                Back to Editor
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
