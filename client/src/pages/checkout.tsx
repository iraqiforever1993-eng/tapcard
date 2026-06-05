import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Package, Shield } from "lucide-react";

export default function Checkout() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function startTrial() {
    if (!user) {
      navigate("/signup");
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/billing/create-checkout-session", {});
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({
        title: "Couldn't start checkout",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center">
          <Logo />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-border bg-card p-10 text-center space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Start your free trial</h1>
              <p className="mt-3 text-muted-foreground text-lg">
                7 days free, then $10.99/month
              </p>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-background p-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Digital business card — $10.99/mo</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Fully customizable card with your own link. Share via NFC, QR, or link.
                    Cancel any time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-background p-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Physical TapCard — $39.99 (one-time)</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Premium NFC card mailed to you. Tap it with any phone to share your card
                    instantly. Ships within 5 business days.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-background p-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">7-day free trial</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    No charge today. Cancel before day 7 and you'll never pay a cent.
                    We'll send a reminder 2 days before.
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full rounded-2xl text-base font-semibold h-14"
              onClick={startTrial}
              disabled={loading}
              data-testid="button-start-trial"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : null}
              {loading ? "Redirecting…" : "Start free trial →"}
            </Button>

            <p className="text-xs text-muted-foreground">
              By continuing you agree to our Terms of Service. Secure checkout powered by Stripe.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
