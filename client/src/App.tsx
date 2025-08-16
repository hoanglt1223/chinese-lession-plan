import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AIProvider } from "@/contexts/AIContext";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Tools from "@/pages/tools";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Check if we're in dev mode with login bypass
  const skipLogin = import.meta.env.VITE_SKIP_LOGIN === 'true' || 
                   (import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH === 'true');

  if (!isAuthenticated && !skipLogin) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tools" component={Tools} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AIProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AIProvider>
    </QueryClientProvider>
  );
}

export default App;
