import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import PublicCard from "@/pages/public-card";
import Checkout from "@/pages/checkout";
import Paywall from "@/pages/paywall";
import { AuthProvider, useAuth } from "./lib/auth";
import { useEffect } from "react";

// Paywall guard: checks subscription status and redirects if needed
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [location, navigate] = useLocation();

  const protectedPaths = ["/dashboard"];
  const isProtected = protectedPaths.some((p) => location.startsWith(p));

  useEffect(() => {
    if (!isProtected) return;
    if (!token) return; // not logged in, let dashboard handle it
    if (!user) return;

    const status = user.subscriptionStatus;
    if (status === null || status === undefined) {
      // New user — push to checkout
      navigate("/checkout");
    } else if (status === "canceled" || status === "past_due") {
      navigate("/paywall");
    }
    // trialing or active: allow through
  }, [user, token, isProtected, navigate, location]);

  return <>{children}</>;
}

function AppRouter() {
  return (
    <AuthGuard>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/paywall" component={Paywall} />
        <Route path="/c/:slug" component={PublicCard} />
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
