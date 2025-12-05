import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon, Music, User, ListMusic, ArrowLeft, Play } from "lucide-react";
import { toast } from "sonner";
import { useAudio } from "@/contexts/AudioContext";

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "tracks");
  const [tracks, setTracks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { play } = useAudio();
  const [isHashtagSearch, setIsHashtagSearch] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Update URL params when tab changes (not query - that causes race conditions)
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (activeTab !== "tracks") {
      params.set("tab", activeTab);
    } else {
      params.delete("tab");
    }
    // Only update if tab changed
    if (params.get("tab") !== searchParams.get("tab")) {
      setSearchParams(params, { replace: true });
    }
  }, [activeTab]);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch(debouncedQuery);
    } else {
      setTracks([]);
      setUsers([]);
      setPlaylists([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    
    // Check if it's a hashtag search
    const isHashtag = searchQuery.startsWith('#');
    setIsHashtagSearch(isHashtag);
    const cleanQuery = isHashtag ? searchQuery.slice(1) : searchQuery;

    try {
      // Search tracks
      let tracksQuery = supabase
        .from("snippets")
        .select(`
          *,
          artist_profiles!inner (
            artist_name,
            user_id
          )
        `)
        .eq("status", "approved");

      if (isHashtag) {
        // Search by hashtag
        const { data: hashtagData } = await supabase
          .from("hashtags")
          .select("id")
          .eq("tag", cleanQuery.toLowerCase())
          .single();

        if (hashtagData) {
          const { data: snippetIds } = await supabase
            .from("snippet_hashtags")
            .select("snippet_id")
            .eq("hashtag_id", hashtagData.id);

          if (snippetIds && snippetIds.length > 0) {
            tracksQuery = tracksQuery.in("id", snippetIds.map(s => s.snippet_id));
          } else {
            setTracks([]);
            setUsers([]);
            setPlaylists([]);
            setIsSearching(false);
            return;
          }
        } else {
          setTracks([]);
          setUsers([]);
          setPlaylists([]);
          setIsSearching(false);
          return;
        }
      } else {
        // Regular search
        tracksQuery = tracksQuery.or(`title.ilike.%${cleanQuery}%,genre.ilike.%${cleanQuery}%`);
      }

      const { data: tracksData } = await tracksQuery.limit(20);

      setTracks(tracksData?.map(s => ({
        ...s,
        artist_name: s.artist_profiles.artist_name
      })) || []);

      // Don't search users/playlists for hashtag searches
      if (isHashtag) {
        setUsers([]);
        setPlaylists([]);
        setIsSearching(false);
        return;
      }

      // Search users/profiles
      const { data: usersData } = await supabase
        .from("profiles")
        .select(`
          *,
          artist_profiles (
            artist_name,
            verified
          )
        `)
        .or(`username.ilike.%${searchQuery}%`)
        .limit(20);

      setUsers(usersData || []);

      // Search playlists
      const { data: playlistsData } = await supabase
        .from("playlists")
        .select(`
          *,
          profiles!playlists_creator_id_fkey (
            username,
            avatar_url
          )
        `)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(20);

      setPlaylists(playlistsData || []);
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayTrack = (snippet: any) => {
    play(snippet.id, snippet.audio_url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tracks, artists, playlists... Use # for hashtags"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="tracks" className="gap-2">
                <Music className="w-4 h-4" />
                Tracks
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <User className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="playlists" className="gap-2">
                <ListMusic className="w-4 h-4" />
                Playlists
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Results */}
      <main className="max-w-3xl mx-auto p-4">
        <Tabs value={activeTab} className="w-full">
          {/* Tracks Tab */}
          <TabsContent value="tracks" className="space-y-2">
            {isSearching ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 glass rounded-lg animate-pulse" />
                ))}
              </div>
            ) : tracks.length > 0 ? (
              tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handlePlayTrack(track)}
                  className="w-full flex items-center gap-3 p-3 glass rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="relative w-14 h-14 rounded-md overflow-hidden bg-gradient-to-br from-primary to-secondary flex-shrink-0">
                    {track.cover_image_url ? (
                      <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-foreground opacity-50" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold line-clamp-1">{track.title}</h3>
                    <p className="text-sm text-muted-foreground">{track.artist_name}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {track.views || 0} plays
                  </div>
                </button>
              ))
            ) : query.trim() ? (
              <EmptyState query={query} type="tracks" />
            ) : null}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-2">
            {isSearching ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 glass rounded-lg animate-pulse" />
                ))}
              </div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => navigate(`/u/${user.username}`)}
                  className="w-full flex items-center gap-3 p-3 glass rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar_url} alt={user.username} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold">{user.username}</h3>
                    {user.bio && <p className="text-sm text-muted-foreground line-clamp-1">{user.bio}</p>}
                  </div>
                </button>
              ))
            ) : query.trim() ? (
              <EmptyState query={query} type="users" />
            ) : null}
          </TabsContent>

          {/* Playlists Tab */}
          <TabsContent value="playlists" className="space-y-2">
            {isSearching ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 glass rounded-lg animate-pulse" />
                ))}
              </div>
            ) : playlists.length > 0 ? (
              playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="flex items-center gap-3 p-3 glass rounded-lg"
                >
                  <div className="w-14 h-14 rounded-md overflow-hidden bg-gradient-to-br from-primary to-secondary flex-shrink-0">
                    {playlist.cover_path ? (
                      <img src={playlist.cover_path} alt={playlist.title} className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-foreground opacity-50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-1">{playlist.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      by {playlist.profiles?.username}
                    </p>
                  </div>
                </div>
              ))
            ) : query.trim() ? (
              <EmptyState query={query} type="playlists" />
            ) : null}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function EmptyState({ query, type }: { query: string; type: string }) {
  return (
    <div className="text-center py-12 space-y-3 animate-in fade-in duration-500">
      <div className="w-16 h-16 mx-auto rounded-full glass flex items-center justify-center">
        <SearchIcon className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">No {type} found</h3>
        <p className="text-muted-foreground">
          No results for "{query}"
        </p>
      </div>
    </div>
  );
}
