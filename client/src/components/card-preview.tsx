import { useState } from "react";
import {
  Phone,
  Mail,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  Download,
  UserPlus,
  Loader2,
} from "lucide-react";
import type { AuthCard } from "@/lib/auth";
import {
  isNative,
  saveContact,
  hapticTap,
  hapticSuccess,
  hapticError,
} from "@/lib/native";
import { useToast } from "@/hooks/use-toast";

type PreviewCardData = Partial<AuthCard> & {
  fullName?: string;
  accentColor?: string;
};

export function CardPreview({
  card,
  vcardUrl,
}: {
  card: PreviewCardData;
  vcardUrl?: string;
}) {
  const accent = card.accentColor || "#0ea5e9";
  const native = isNative();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  async function handleNativeSave(e: React.MouseEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await hapticTap();
      await saveContact({
        fullName: card.fullName,
        jobTitle: card.jobTitle,
        company: card.company,
        phone: card.phone,
        email: card.email,
        website: card.website,
        bio: card.bio,
        photoDataUrl: card.photoDataUrl,
      });
      await hapticSuccess();
      toast({ title: "Saved to Contacts" });
    } catch (err: any) {
      await hapticError();
      toast({
        title: "Couldn't save contact",
        description: err?.message || "Permission denied?",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }
  const initials = (card.fullName || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const links: { icon: any; label: string; href: string; testId: string }[] = [];
  if (card.phone) links.push({ icon: Phone, label: "Call", href: `tel:${card.phone}`, testId: "link-phone" });
  if (card.email) links.push({ icon: Mail, label: "Email", href: `mailto:${card.email}`, testId: "link-email" });
  if (card.website)
    links.push({
      icon: Globe,
      label: "Website",
      href: normalizeUrl(card.website),
      testId: "link-website",
    });
  if (card.linkedin)
    links.push({
      icon: Linkedin,
      label: "LinkedIn",
      href: normalizeUrl(card.linkedin),
      testId: "link-linkedin",
    });
  if (card.twitter)
    links.push({
      icon: Twitter,
      label: "Twitter",
      href: normalizeUrl(card.twitter),
      testId: "link-twitter",
    });
  if (card.instagram)
    links.push({
      icon: Instagram,
      label: "Instagram",
      href: normalizeUrl(card.instagram),
      testId: "link-instagram",
    });

  return (
    <div
      className="w-full mx-auto rounded-3xl border border-card-border bg-card p-8 text-center"
      data-testid="card-preview"
    >
      <div
        className="mx-auto h-32 w-32 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-bold ring-4 ring-background"
        style={{
          backgroundImage: card.photoDataUrl
            ? `url(${card.photoDataUrl})`
            : `linear-gradient(135deg, ${accent}, ${shade(accent, -15)})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: `0 0 0 4px ${accent}22`,
        }}
      >
        {!card.photoDataUrl && (initials || "?")}
      </div>
      <h2
        className="mt-6 text-2xl font-bold tracking-tight"
        data-testid="text-fullname"
      >
        {card.fullName || "Your Name"}
      </h2>
      {(card.jobTitle || card.company) && (
        <p className="mt-1 text-sm text-muted-foreground">
          {card.jobTitle}
          {card.jobTitle && card.company ? " · " : ""}
          {card.company}
        </p>
      )}
      {card.bio && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {card.bio}
        </p>
      )}

      {native ? (
        <button
          type="button"
          onClick={handleNativeSave}
          disabled={saving}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl font-semibold py-3.5 text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: accent, color: pickFg(accent) }}
          data-testid="button-save-contact"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save to Contacts"}
        </button>
      ) : (
        <a
          href={vcardUrl || "#"}
          onClick={(e) => {
            if (!vcardUrl) e.preventDefault();
          }}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl font-semibold py-3.5 text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent, color: pickFg(accent) }}
          data-testid="button-save-contact"
        >
          <Download className="h-4 w-4" />
          Save to Contacts
        </a>
      )}

      {links.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              data-testid={l.testId}
              className="flex items-center justify-center gap-2 rounded-xl border border-card-border bg-background py-3 text-sm font-medium hover-elevate"
            >
              <l.icon className="h-4 w-4" style={{ color: accent }} />
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (/^mailto:|^tel:/i.test(url)) return url;
  return `https://${url}`;
}

function pickFg(hex: string): string {
  // pick white or black based on luminance
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#fff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0b1220" : "#ffffff";
}

function shade(hex: string, percent: number): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const adj = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + (percent / 100) * 255)));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
}
