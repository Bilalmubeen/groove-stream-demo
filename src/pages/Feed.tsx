import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SnippetCard } from "@/components/Feed/SnippetCard";
import { NotificationBadge } from "@/components/Notifications/NotificationBadge";
import { BottomNav } from "@/components/Navigation/BottomNav";
import { toast } from "sonner";
import { User, LogOut, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/beatseek-logo.png";
import { useEngagement } from "@/hooks/useEngagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function Feed() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [snippets, setSnippets] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interactions, setInteractions] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [feedFilter, setFeedFilter] = useState<"for-you" | "following">("for-you");
  const containerRef = useRef<HTMLDivElement>(null);
  const { trackEvent } = useEngagement();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          navigate("/login");
          return;
        }

        if (mounted) {
          setUser(session.user);
          setIsLoading(true);
          await Promise.all([
            fetchSnippets(),
            fetchInteractions(session.user.id)
          ]);
        }
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/login");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      } else if (mounted) {
        setUser(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchSnippets = async () => {
    try {
      let query = supabase
        .from("snippets")
        .select(`
          *,
          artist_profiles!snippets_artist_id_fkey (
            id,
            artist_name,
            user_id
          )
        `)
        .eq("status", "approved");

      // Apply "Following" filter
      if (feedFilter === "following" && user) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = follows?.map(f => f.following_id) || [];
        
        if (followingIds.length === 0) {
          setSnippets([]);
          setIsLoading(false);
          return;
        }

        query = query.in("artist_id", followingIds);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedSnippets = data?.map((snippet: any) => {
        const artistProfile = Array.isArray(snippet.artist_profiles)
          ? snippet.artist_profiles[0]
          : snippet.artist_profiles;

        return {
          ...snippet,
          artist_profiles: artistProfile ?? null,
          artist_name: artistProfile?.artist_name?.trim() || "Unknown Artist",
        };
      }) || [];

      setSnippets(formattedSnippets);
    } catch (error) {
      toast.error("Failed to load snippets");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInteractions = async (userId: string) => {
    const { data } = await supabase
      .from("user_snippet_interactions")
      .select("*")
      .eq("user_id", userId);

    if (data) {
      const interactionsMap = new Map();
      data.forEach((interaction) => {
        interactionsMap.set(interaction.snippet_id, interaction);
      });
      setInteractions(interactionsMap);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const itemHeight = window.innerHeight;
    const index = Math.round(scrollTop / itemHeight);
    setCurrentIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          containerRef.current.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
          break;
        case 'ArrowUp':
          e.preventDefault();
          containerRef.current.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
          break;
        case ' ':
          e.preventDefault();
          // Toggle play/pause on current snippet
          const currentSnippet = snippets[currentIndex];
          if (currentSnippet) {
            const audioElements = document.querySelectorAll('audio');
            audioElements[currentIndex]?.paused
              ? audioElements[currentIndex]?.play()
              : audioElements[currentIndex]?.pause();
          }
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          const snippet = snippets[currentIndex];
          if (snippet) handleLike(snippet.id);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, snippets]);

  // Refresh snippets when filters change
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchSnippets();
    }
  }, [feedFilter]);

  const handleLike = async (snippetId: string) => {
    if (!user) return;

    const currentInteraction = interactions.get(snippetId);
    const newLikedState = !currentInteraction?.liked;

    try {
      const { error } = await supabase
        .from("user_snippet_interactions")
        .upsert({
          user_id: user.id,
          snippet_id: snippetId,
          liked: newLikedState,
          saved: currentInteraction?.saved || false,
        }, {
          onConflict: 'user_id,snippet_id'
        });

      if (error) throw error;

      // Update local state
      const newInteractions = new Map(interactions);
      newInteractions.set(snippetId, {
        ...currentInteraction,
        liked: newLikedState,
      });
      setInteractions(newInteractions);

      // Update snippet likes count
      setSnippets(prev => prev.map(s =>
        s.id === snippetId
          ? { ...s, likes: s.likes + (newLikedState ? 1 : -1) }
          : s
      ));

      toast.success(newLikedState ? "Added to likes!" : "Removed from likes");

      // Track engagement
      if (newLikedState) {
        trackEvent(snippetId, 'like');
      }
    } catch (error) {
      console.error('Like error:', error);
      toast.error("Failed to update like");
    }
  };

  const handleSave = async (snippetId: string) => {
    if (!user) return;

    const currentInteraction = interactions.get(snippetId);
    const newSavedState = !currentInteraction?.saved;

    try {
      const { error } = await supabase
        .from("user_snippet_interactions")
        .upsert({
          user_id: user.id,
          snippet_id: snippetId,
          saved: newSavedState,
          liked: currentInteraction?.liked || false,
        }, {
          onConflict: 'user_id,snippet_id'
        });

      if (error) throw error;

      const newInteractions = new Map(interactions);
      newInteractions.set(snippetId, {
        ...currentInteraction,
        saved: newSavedState,
      });
      setInteractions(newInteractions);

      toast.success(newSavedState ? "Saved to library!" : "Removed from library");

      // Track engagement
      if (newSavedState) {
        trackEvent(snippetId, 'save');
      }
    } catch (error) {
      toast.error("Failed to save");
    }
  };

  const handleShare = (snippet: any) => {
    trackEvent(snippet.id, 'share');

    if (navigator.share) {
      navigator.share({
        title: snippet.title,
        text: `Check out "${snippet.title}" by ${snippet.artist_name} on BeatSeek!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <img src={logo} alt="BeatSeek" className="w-24 h-24 mx-auto animate-pulse-glow" />
          <p className="text-muted-foreground">Loading amazing tracks...</p>
        </div>
      </div>
    );
  }

  if (snippets.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <img src={logo} alt="BeatSeek" className="w-24 h-24 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold gradient-text">
              {feedFilter === "following" ? "No tracks from artists you follow" : "No tracks yet!"}
            </h2>
            <p className="text-muted-foreground">
              {feedFilter === "following" 
                ? "Start following artists to see their content here" 
                : "Be the first to upload some music"}
            </p>
          </div>
          {feedFilter === "following" && (
            <Button onClick={() => setFeedFilter("for-you")} variant="outline">
              View all tracks
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden pb-16 md:pb-0">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between p-3 md:p-4 max-w-7xl mx-auto">
          {!isMobile && <img src={logo} alt="BeatSeek" className="w-10 h-10" />}
          <h1 className={cn("text-lg md:text-xl font-bold gradient-text", isMobile && "flex-1")}>BeatSeek</h1>
          <div className="flex items-center gap-1 md:gap-2">
            <NotificationBadge />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/messages")}
              aria-label="Messages"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/search")}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Button>
            {!isMobile && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/profile")}
                  aria-label="Profile"
                >
                  <User className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Feed Filter Tabs */}
        <div className="flex items-center gap-1 px-3 md:px-4 pb-2 md:pb-3 max-w-7xl mx-auto">
          <Button
            variant={feedFilter === "for-you" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFeedFilter("for-you")}
            className="text-xs md:text-sm"
          >
            For You
          </Button>
          <Button
            variant={feedFilter === "following" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFeedFilter("following")}
            className="text-xs md:text-sm"
          >
            Following
          </Button>
        </div>
      </header>

      {/* Feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth pt-16"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {snippets.map((snippet, index) => (
          <SnippetCard
            key={snippet.id}
            snippet={snippet}
            isActive={index === currentIndex}
            onLike={() => handleLike(snippet.id)}
            onSave={() => handleSave(snippet.id)}
            onShare={() => handleShare(snippet)}
            isLiked={interactions.get(snippet.id)?.liked || false}
            isSaved={interactions.get(snippet.id)?.saved || false}
          />
        ))}
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />
    </div>
  );
}
