import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, CreditCard, Calendar } from "lucide-react";

export default function BillingTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/billing/portal");
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Couldn't open billing portal",
        description: err.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const status = user?.subscriptionStatus;
  const trialEndsAt = user?.trialEndsAt;
  const now = Date.now();
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)))
    : null;

  function statusBadge() {
    if (status === "trialing") return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20">Trial</Badge>;
    if (status === "active") return <Badge className="bg-green-500/15 text-green-400 border-green-500/20">Active</Badge>;
    if (status === "past_due") return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20">Past due</Badge>;
    if (status === "canceled") return <Badge className="bg-red-500/15 text-red-400 border-red-500/20">Canceled</Badge>;
    return <Badge variant="outline">No subscription</Badge>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and payment method.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">TapCard — $10.99/mo</span>
          </div>
          {statusBadge()}
        </div>

        {status === "trialing" && daysLeft !== null && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
            <Calendar className="h-4 w-4" />
            <span>
              {daysLeft > 0
                ? `Trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                : "Trial ends today"}
              . Your card will remain live after you're billed.
            </span>
          </div>
        )}

        {status === "past_due" && (
          <div className="rounded-xl bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
            Your last payment failed. Update your payment method to keep your card live.
          </div>
        )}

        {status === "canceled" && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Your subscription has ended. Your public card is no longer visible.
          </div>
        )}

        {user?.stripeCustomerId ? (
          <Button
            variant="outline"
            onClick={openPortal}
            disabled={loading}
            className="rounded-xl"
            data-testid="button-billing-portal"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Manage subscription
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            No billing account connected yet. Start your free trial from the checkout page.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <p className="font-medium text-sm">Physical TapCard</p>
        <p className="text-sm text-muted-foreground">
          Your physical NFC card ships after checkout confirmation. Once shipped, we'll
          update your account. Contact support if you have questions.
        </p>
      </div>
    </div>
  );
}
