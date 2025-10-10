import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./components/Auth/LoginPage";
import Feed from "./pages/Feed";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Upload from "./pages/Upload";
import { AudioProvider } from "./contexts/AudioContext";
import { GlobalUploadCTA } from "./components/Upload/GlobalUploadCTA";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AudioProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalUploadCTA />
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/u/:handle" element={<Profile />} />
            <Route path="/welcome" element={<Index />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AudioProvider>
  </QueryClientProvider>
);

export default App;
