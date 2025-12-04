import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AudioProvider } from "./contexts/AudioContext";

// Lazy load pages for better error isolation
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./components/Auth/LoginPage"));
const Feed = lazy(() => import("./pages/Feed"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Upload = lazy(() => import("./pages/Upload"));
const Search = lazy(() => import("./pages/Search"));
const Notifications = lazy(() => import("./pages/Notifications"));
const FollowersList = lazy(() => import("./pages/FollowersList"));
const Messages = lazy(() => import("./pages/Messages"));
const Explore = lazy(() => import("./pages/Explore"));
const Playlist = lazy(() => import("./pages/Playlist"));
const PlaylistInvite = lazy(() => import("./pages/PlaylistInvite"));
import Profile from "./pages/Profile";
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SnippetAnalytics = lazy(() => import("./pages/SnippetAnalytics"));
const VariantManagement = lazy(() => import("./pages/VariantManagement"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AudioProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Feed />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/search" element={<Search />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/u/:handle/followers" element={<FollowersList />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/playlist/:id" element={<Playlist />} />
                <Route path="/playlist/:id/invite/:token" element={<PlaylistInvite />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/u/:handle" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/analytics/snippet/:id" element={<SnippetAnalytics />} />
                <Route path="/profile/snippets/:id/variants" element={<VariantManagement />} />
                <Route path="/welcome" element={<Index />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AudioProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
