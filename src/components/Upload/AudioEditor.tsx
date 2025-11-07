import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, Save, X, Scissors } from "lucide-react";
import { toast } from "sonner";

interface AudioEditorProps {
  audioUrl: string;
  onSave: (editedBlob: Blob, metadata: any) => void;
  onCancel: () => void;
}

export function AudioEditor({ audioUrl, onSave, onCancel }: AudioEditorProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regionsPlugin = useRef<RegionsPlugin | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [volume, setVolume] = useState(100);
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!waveformRef.current) return;

    // Initialize regions plugin
    regionsPlugin.current = RegionsPlugin.create();

    // Initialize WaveSurfer
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "hsl(var(--muted-foreground))",
      progressColor: "hsl(var(--primary))",
      cursorColor: "hsl(var(--primary))",
      height: 128,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      plugins: [regionsPlugin.current]
    });

    wavesurfer.current.load(audioUrl);

    wavesurfer.current.on("ready", () => {
      const audioDuration = wavesurfer.current!.getDuration();
      setDuration(audioDuration);
      setTrimEnd(Math.min(30, audioDuration));
      setLoading(false);

      // Add initial region for trimming
      regionsPlugin.current!.addRegion({
        start: 0,
        end: Math.min(30, audioDuration),
        color: "hsla(var(--primary) / 0.2)",
        drag: true,
        resize: true
      });
    });

    wavesurfer.current.on("play", () => setIsPlaying(true));
    wavesurfer.current.on("pause", () => setIsPlaying(false));

    // Listen to region updates
    regionsPlugin.current.on("region-updated", (region: any) => {
      setTrimStart(region.start);
      setTrimEnd(region.end);
      
      // Enforce 30s max
      if (region.end - region.start > 30) {
        region.setOptions({ end: region.start + 30 });
      }
    });

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(volume / 100);
    }
  }, [volume]);

  const handlePlayPause = () => {
    wavesurfer.current?.playPause();
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Get the audio buffer
      const audioBuffer = wavesurfer.current?.getDecodedData();
      if (!audioBuffer) {
        throw new Error("No audio data available");
      }

      // Calculate sample positions
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(trimStart * sampleRate);
      const endSample = Math.floor(trimEnd * sampleRate);
      const duration = endSample - startSample;

      // Create new buffer with trimmed audio
      const numberOfChannels = audioBuffer.numberOfChannels;
      const audioContext = new AudioContext();
      const trimmedBuffer = audioContext.createBuffer(
        numberOfChannels,
        duration,
        sampleRate
      );

      // Copy trimmed audio data
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const trimmedData = trimmedBuffer.getChannelData(channel);
        
        for (let i = 0; i < duration; i++) {
          let sample = channelData[startSample + i];
          
          // Apply fade in
          if (fadeIn && i < sampleRate * 0.5) {
            sample *= i / (sampleRate * 0.5);
          }
          
          // Apply fade out
          if (fadeOut && i > duration - sampleRate * 0.5) {
            sample *= (duration - i) / (sampleRate * 0.5);
          }
          
          // Apply volume
          sample *= volume / 100;
          
          trimmedData[i] = sample;
        }
      }

      // Convert to WAV blob
      const blob = await audioBufferToWavBlob(trimmedBuffer);

      const metadata = {
        trimStart,
        trimEnd,
        volume,
        fadeIn,
        fadeOut,
        originalDuration: duration / sampleRate
      };

      onSave(blob, metadata);
      toast.success("Audio edited successfully!");
    } catch (error: any) {
      toast.error("Failed to process audio: " + error.message);
      setLoading(false);
    }
  };

  const audioBufferToWavBlob = async (buffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = new Float32Array(buffer.length * numberOfChannels);
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < buffer.length; i++) {
        data[i * numberOfChannels + channel] = channelData[i];
      }
    }

    const dataLength = data.length * bytesPerSample;
    const headerLength = 44;
    const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Audio Editor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Waveform */}
        <div className="space-y-2">
          <div ref={waveformRef} className="w-full bg-muted/30 rounded-lg" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{trimStart.toFixed(2)}s</span>
            <span>{trimEnd.toFixed(2)}s</span>
            <span>Duration: {(trimEnd - trimStart).toFixed(2)}s / 30s max</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex justify-center">
          <Button
            onClick={handlePlayPause}
            disabled={loading}
            size="lg"
            variant="outline"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
        </div>

        {/* Volume Control */}
        <div className="space-y-2">
          <Label>Volume: {volume}%</Label>
          <Slider
            value={[volume]}
            onValueChange={([v]) => setVolume(v)}
            min={0}
            max={200}
            step={1}
          />
        </div>

        {/* Effects */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="fade-in">Fade In (0.5s)</Label>
            <Switch
              id="fade-in"
              checked={fadeIn}
              onCheckedChange={setFadeIn}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="fade-out">Fade Out (0.5s)</Label>
            <Switch
              id="fade-out"
              checked={fadeOut}
              onCheckedChange={setFadeOut}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Processing..." : "Save & Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
