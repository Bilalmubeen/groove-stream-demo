import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SnippetCard } from "@/components/Feed/SnippetCard";
import { toast } from "sonner";
import { User, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/beatseek-logo.png";

export default function Feed() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [snippets, setSnippets] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interactions, setInteractions] = useState<Map<string, any>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
        fetchSnippets();
        fetchInteractions(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchSnippets = async () => {
    const { data, error } = await supabase
      .from("snippets")
      .select(`
        *,
        artist_profiles!inner (
          artist_name,
          user_id
        )
      `)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      toast.error("Failed to load snippets");
      return;
    }

    const formattedSnippets = data?.map((snippet: any) => ({
      ...snippet,
      artist_name: snippet.artist_profiles.artist_name,
    })) || [];

    setSnippets(formattedSnippets);
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
    } catch (error) {
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
        });

      if (error) throw error;

      const newInteractions = new Map(interactions);
      newInteractions.set(snippetId, {
        ...currentInteraction,
        saved: newSavedState,
      });
      setInteractions(newInteractions);

      toast.success(newSavedState ? "Saved to library!" : "Removed from library");
    } catch (error) {
      toast.error("Failed to save");
    }
  };

  const handleShare = (snippet: any) => {
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

  if (snippets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <img src={logo} alt="BeatSeek" className="w-24 h-24 mx-auto animate-pulse-glow" />
          <p className="text-muted-foreground">Loading amazing tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <img src={logo} alt="BeatSeek" className="w-10 h-10" />
          <h1 className="text-xl font-bold gradient-text">BeatSeek</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
            >
              <User className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
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
    </div>
  );
}
