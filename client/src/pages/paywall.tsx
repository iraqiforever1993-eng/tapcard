import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

export default function Paywall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function resubscribe() {
    if (!user) return;
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
        title: "Couldn't open checkout",
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
        <div className="w-full max-w-md text-center space-y-8">
          <div className="mx-auto h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscription ended</h1>
            <p className="mt-3 text-muted-foreground text-lg">
              Your subscription has ended. Resubscribe to keep your card live and accessible.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-left space-y-3">
            <p className="font-semibold">What you get with TapCard:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>✓ Permanent public link at your custom slug</li>
              <li>✓ NFC tag programming</li>
              <li>✓ Beautiful customizable card designs</li>
              <li>✓ QR code sharing</li>
              <li>✓ vCard download for contacts</li>
            </ul>
            <p className="text-sm font-medium">$10.99/month — cancel any time</p>
          </div>
          <Button
            size="lg"
            className="w-full rounded-2xl text-base font-semibold h-14"
            onClick={resubscribe}
            disabled={loading}
            data-testid="button-resubscribe"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : null}
            {loading ? "Redirecting…" : "Resubscribe →"}
          </Button>
        </div>
      </main>
    </div>
  );
}
