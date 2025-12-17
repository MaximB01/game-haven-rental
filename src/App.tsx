import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import GameServers from "./pages/GameServers";
import GameDetail from "./pages/GameDetail";
import DynamicProductPage from "./pages/DynamicProductPage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import ServerStatusPage from "./pages/ServerStatusPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/game-servers" element={<GameServers />} />
            <Route path="/game-servers/:gameId" element={<GameDetail />} />
            {/* Dynamic product pages - handles VPS, Bot Hosting, Web Hosting, and any product with own_page */}
            <Route path="/product/:slug" element={<DynamicProductPage />} />
            {/* Legacy routes that redirect to dynamic pages */}
            <Route path="/vps" element={<DynamicProductPage />} />
            <Route path="/bot-hosting" element={<DynamicProductPage />} />
            <Route path="/web-hosting" element={<DynamicProductPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/status" element={<ServerStatusPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
