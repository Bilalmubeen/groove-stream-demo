import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Music2, Sparkles, TrendingUp, Users } from "lucide-react";
import logo from "@/assets/beatseek-logo.png";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      <div 
        className="absolute inset-0 opacity-40"
        style={{ background: "var(--gradient-glow)" }}
      />

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-8">
          <img 
            src={logo} 
            alt="BeatSeek" 
            className="w-32 h-32 animate-pulse-glow"
          />
          
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-6xl md:text-7xl font-bold">
              <span className="gradient-text">BeatSeek</span>
            </h1>
            <p className="text-2xl md:text-3xl text-muted-foreground">
              Discover Your Next Favorite Track
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Swipe through 30-second music snippets from indie artists around the world. 
              Like what you hear? Save it. Love it? Share it.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button
              size="lg"
              onClick={() => navigate("/login")}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-lg px-8 py-6"
            >
              Get Started
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl">
            <div className="glass p-6 rounded-2xl space-y-4 transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Music2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Endless Discovery</h3>
              <p className="text-muted-foreground">
                Swipe through an infinite feed of 30-second snippets from emerging artists
              </p>
            </div>

            <div className="glass p-6 rounded-2xl space-y-4 transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold">Smart Algorithm</h3>
              <p className="text-muted-foreground">
                Our AI learns your taste and serves up tracks you'll love
              </p>
            </div>

            <div className="glass p-6 rounded-2xl space-y-4 transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Support Artists</h3>
              <p className="text-muted-foreground">
                Help indie musicians get discovered by liking and sharing their work
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
