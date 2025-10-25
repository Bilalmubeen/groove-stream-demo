import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Music, Play, TrendingUp, Sparkles, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAudio } from "@/contexts/AudioContext";

interface Snippet {
  id: string;
  title: string;
  artist_name: string;
  cover_image_url: string;
  audio_url: string;
  views: number;
  genre: string;
}

export default function Explore() {
  const navigate = useNavigate();
  const { play } = useAudio();
  const [trending, setTrending] = useState<Snippet[]>([]);
  const [emerging, setEmerging] = useState<Snippet[]>([]);
  const [byGenre, setByGenre] = useState<Record<string, Snippet[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchExploreData();
  }, []);

  const fetchExploreData = async () => {
    try {
      // Fetch trending (using trending_scores table)
      const { data: trendingData } = await supabase
        .from("trending_scores")
        .select(`
          snippet_id,
          snippets!inner (
            id,
            title,
            cover_image_url,
            audio_url,
            views,
            genre,
            artist_profiles!inner (
              artist_name
            )
          )
        `)
        .order("score", { ascending: false })
        .limit(10);

      const trendingSnippets = trendingData?.map((t: any) => ({
        id: t.snippets.id,
        title: t.snippets.title,
        artist_name: t.snippets.artist_profiles.artist_name,
        cover_image_url: t.snippets.cover_image_url,
        audio_url: t.snippets.audio_url,
        views: t.snippets.views,
        genre: t.snippets.genre
      })) || [];
      setTrending(trendingSnippets);

      // Fetch emerging artists (created in last 30 days, sorted by engagement)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: emergingData } = await supabase
        .from("snippets")
        .select(`
          *,
          artist_profiles!inner (
            artist_name,
            created_at
          )
        `)
        .eq("status", "approved")
        .gte("artist_profiles.created_at", thirtyDaysAgo.toISOString())
        .order("views", { ascending: false })
        .limit(10);

      const emergingSnippets = emergingData?.map((s: any) => ({
        id: s.id,
        title: s.title,
        artist_name: s.artist_profiles.artist_name,
        cover_image_url: s.cover_image_url,
        audio_url: s.audio_url,
        views: s.views,
        genre: s.genre
      })) || [];
      setEmerging(emergingSnippets);

      // Fetch by genre
      const genres = ["hip-hop", "pop", "rock", "edm", "r&b"];
      const genreData: Record<string, Snippet[]> = {};

      for (const genre of genres) {
        const { data } = await supabase
          .from("snippets")
          .select(`
            *,
            artist_profiles!inner (
              artist_name
            )
          `)
          .eq("status", "approved")
          .eq("genre", genre as any)
          .order("views", { ascending: false })
          .limit(6);

        genreData[genre] = data?.map((s: any) => ({
          id: s.id,
          title: s.title,
          artist_name: s.artist_profiles.artist_name,
          cover_image_url: s.cover_image_url,
          audio_url: s.audio_url,
          views: s.views,
          genre: s.genre
        })) || [];
      }
      setByGenre(genreData);
    } catch (error) {
      console.error("Error fetching explore data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const SnippetCard = ({ snippet }: { snippet: Snippet }) => (
    <Card className="overflow-hidden hover:scale-105 transition-transform cursor-pointer group">
      <button
        onClick={() => play(snippet.id, snippet.audio_url)}
        className="relative w-full"
      >
        <div className="aspect-square bg-gradient-to-br from-primary to-secondary relative">
          {snippet.cover_image_url ? (
            <img
              src={snippet.cover_image_url}
              alt={snippet.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-primary-foreground opacity-50" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="w-12 h-12 text-white" />
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-1">{snippet.title}</h3>
          <p className="text-xs text-muted-foreground">{snippet.artist_name}</p>
          <p className="text-xs text-muted-foreground">{snippet.views} plays</p>
        </div>
      </button>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading explore...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Explore</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-8">
        {/* Trending This Week */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Trending This Week</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {trending.map((snippet) => (
              <SnippetCard key={snippet.id} snippet={snippet} />
            ))}
          </div>
        </section>

        {/* Emerging Artists */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Emerging Artists</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {emerging.map((snippet) => (
              <SnippetCard key={snippet.id} snippet={snippet} />
            ))}
          </div>
        </section>

        {/* By Genre */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Music className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">By Genre</h2>
          </div>
          <Tabs defaultValue="hip-hop">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="hip-hop">Hip Hop</TabsTrigger>
              <TabsTrigger value="pop">Pop</TabsTrigger>
              <TabsTrigger value="rock">Rock</TabsTrigger>
              <TabsTrigger value="edm">EDM</TabsTrigger>
              <TabsTrigger value="r&b">R&B</TabsTrigger>
            </TabsList>
            {Object.entries(byGenre).map(([genre, snippets]) => (
              <TabsContent key={genre} value={genre}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {snippets.map((snippet) => (
                    <SnippetCard key={snippet.id} snippet={snippet} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>
      </main>
    </div>
  );
}
