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

export type PreviewCardData = Partial<AuthCard> & {
  fullName?: string;
  accentColor?: string;
  layoutStyle?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  backgroundPhotoUrl?: string | null;
  profilePhotoUrl?: string | null;
};

export function CardPreview({
  card,
  vcardUrl,
}: {
  card: PreviewCardData;
  vcardUrl?: string;
}) {
  const accent = card.accentColor || "#0ea5e9";
  const layout = card.layoutStyle || "minimal";
  const bgColor = card.backgroundColor || "#0a0a0a";
  const txtColor = card.textColor || "#ffffff";
  const bgPhoto = card.backgroundPhotoUrl || null;
  const profilePhoto = card.profilePhotoUrl || card.photoDataUrl || null;
  const native = isNative();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

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
    links.push({ icon: Globe, label: "Website", href: normalizeUrl(card.website), testId: "link-website" });
  if (card.linkedin)
    links.push({ icon: Linkedin, label: "LinkedIn", href: normalizeUrl(card.linkedin), testId: "link-linkedin" });
  if (card.twitter)
    links.push({ icon: Twitter, label: "Twitter", href: normalizeUrl(card.twitter), testId: "link-twitter" });
  if (card.instagram)
    links.push({ icon: Instagram, label: "Instagram", href: normalizeUrl(card.instagram), testId: "link-instagram" });

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

  const saveButton = native ? (
    <button
      type="button"
      onClick={handleNativeSave}
      disabled={saving}
      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl font-semibold py-3.5 text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ backgroundColor: accent, color: pickFg(accent) }}
      data-testid="button-save-contact"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      {saving ? "Saving…" : "Save to Contacts"}
    </button>
  ) : (
    <a
      href={vcardUrl || "#"}
      onClick={(e) => { if (!vcardUrl) e.preventDefault(); }}
      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl font-semibold py-3.5 text-sm transition-opacity hover:opacity-90"
      style={{ backgroundColor: accent, color: pickFg(accent) }}
      data-testid="button-save-contact"
    >
      <Download className="h-4 w-4" />
      Save to Contacts
    </a>
  );

  const linkGrid = links.length > 0 ? (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target={l.href.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          data-testid={l.testId}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: `${accent}18`,
            border: `1px solid ${accent}30`,
            color: txtColor,
          }}
        >
          <l.icon className="h-4 w-4" style={{ color: accent }} />
          {l.label}
        </a>
      ))}
    </div>
  ) : null;

  // ── Layout: minimal ──────────────────────────────────────────────────────────
  if (layout === "minimal") {
    return (
      <div
        className="w-full mx-auto rounded-3xl overflow-hidden text-center"
        style={{
          backgroundColor: bgColor,
          color: txtColor,
          backgroundImage: bgPhoto ? `url(${bgPhoto})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        data-testid="card-preview"
      >
        {bgPhoto && (
          <div className="absolute inset-0 rounded-3xl" style={{ backgroundColor: `${bgColor}cc` }} />
        )}
        <div className="relative p-8">
          <div
            className="mx-auto h-24 w-24 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold ring-4"
            style={{
              backgroundImage: profilePhoto
                ? `url(${profilePhoto})`
                : `linear-gradient(135deg, ${accent}, ${shade(accent, -15)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: `0 0 0 4px ${accent}33`,
              color: pickFg(accent),
              ringColor: bgColor,
            }}
          >
            {!profilePhoto && (initials || "?")}
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight" data-testid="text-fullname">
            {card.fullName || "Your Name"}
          </h2>
          {(card.jobTitle || card.company) && (
            <p className="mt-1 text-sm opacity-70">
              {card.jobTitle}{card.jobTitle && card.company ? " · " : ""}{card.company}
            </p>
          )}
          {card.bio && (
            <p className="mt-4 text-sm opacity-60 leading-relaxed whitespace-pre-wrap">
              {card.bio}
            </p>
          )}
          {saveButton}
          {linkGrid}
        </div>
      </div>
    );
  }

  // ── Layout: photo_forward ────────────────────────────────────────────────────
  if (layout === "photo_forward") {
    return (
      <div
        className="w-full mx-auto rounded-3xl overflow-hidden"
        style={{ backgroundColor: bgColor, color: txtColor }}
        data-testid="card-preview"
      >
        {/* Hero */}
        <div
          className="h-40 w-full relative"
          style={{
            backgroundImage: bgPhoto
              ? `url(${bgPhoto})`
              : `linear-gradient(135deg, ${accent}, ${shade(accent, -25)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {bgPhoto && (
            <div className="absolute inset-0" style={{ backgroundColor: `${bgColor}55` }} />
          )}
        </div>

        {/* Overlapping avatar */}
        <div className="relative px-8 pb-8">
          <div
            className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold -mt-10 border-4 relative z-10"
            style={{
              backgroundImage: profilePhoto
                ? `url(${profilePhoto})`
                : `linear-gradient(135deg, ${accent}, ${shade(accent, -15)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderColor: bgColor,
              color: pickFg(accent),
            }}
          >
            {!profilePhoto && (initials || "?")}
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight" data-testid="text-fullname">
            {card.fullName || "Your Name"}
          </h2>
          {(card.jobTitle || card.company) && (
            <p className="mt-1 text-sm opacity-70">
              {card.jobTitle}{card.jobTitle && card.company ? " · " : ""}{card.company}
            </p>
          )}
          {card.bio && (
            <p className="mt-3 text-sm opacity-60 leading-relaxed whitespace-pre-wrap">
              {card.bio}
            </p>
          )}
          {saveButton}
          {linkGrid}
        </div>
      </div>
    );
  }

  // ── Layout: bold ─────────────────────────────────────────────────────────────
  return (
    <div
      className="w-full mx-auto rounded-3xl overflow-hidden"
      style={{ backgroundColor: bgColor, color: txtColor }}
      data-testid="card-preview"
    >
      {/* Accent stripe */}
      <div className="h-2 w-full" style={{ backgroundColor: accent }} />

      <div className="p-8">
        <div className="flex items-start gap-5">
          {profilePhoto ? (
            <div
              className="h-20 w-20 rounded-2xl overflow-hidden shrink-0"
              style={{
                backgroundImage: `url(${profilePhoto})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : (
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              {initials || "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2
              className="text-4xl font-black tracking-tight leading-none break-words"
              style={{ color: txtColor }}
              data-testid="text-fullname"
            >
              {card.fullName || "Your Name"}
            </h2>
            {(card.jobTitle || card.company) && (
              <p className="mt-2 text-sm opacity-70 font-medium">
                {card.jobTitle}{card.jobTitle && card.company ? " · " : ""}{card.company}
              </p>
            )}
          </div>
        </div>

        {card.bio && (
          <p className="mt-5 text-sm opacity-60 leading-relaxed whitespace-pre-wrap border-t border-white/10 pt-4">
            {card.bio}
          </p>
        )}
        {saveButton}
        {linkGrid}
      </div>
    </div>
  );
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (/^mailto:|^tel:/i.test(url)) return url;
  return `https://${url}`;
}

export function pickFg(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#fff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0b1220" : "#ffffff";
}

export function shade(hex: string, percent: number): string {
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
