import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./components/Auth/LoginPage";
import Feed from "./pages/Feed";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Upload from "./pages/Upload";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import FollowersList from "./pages/FollowersList";
import Messages from "./pages/Messages";
import Explore from "./pages/Explore";
import Playlist from "./pages/Playlist";
import PlaylistInvite from "./pages/PlaylistInvite";
import { AudioProvider } from "./contexts/AudioContext";
import { GlobalUploadCTA } from "./components/Upload/GlobalUploadCTA";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import SnippetAnalytics from "./pages/SnippetAnalytics";
import VariantManagement from "./pages/VariantManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AudioProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AudioProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
