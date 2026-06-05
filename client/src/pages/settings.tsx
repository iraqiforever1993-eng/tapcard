import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User } from "lucide-react";

export default function SettingsTab() {
  const { user, signOut } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    await signOut();
    navigate("/");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Account details and sign-out.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Account</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-email">Email</Label>
          <Input
            id="account-email"
            value={user?.email || ""}
            readOnly
            className="rounded-xl bg-background"
          />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-destructive/20 bg-card p-6 space-y-4">
        <p className="font-medium text-sm">Danger zone</p>
        <Button
          variant="destructive"
          onClick={handleLogout}
          disabled={signingOut}
          className="rounded-xl"
          data-testid="button-signout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
        <p className="text-xs text-muted-foreground">
          Sessions are stored in memory. You'll need to log back in after sign-out.
        </p>
      </div>
    </div>
  );
}
