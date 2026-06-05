import { useEffect, useRef, useState, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CardPreview } from "@/components/card-preview";
import { API_BASE } from "@/lib/queryClient";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_SWATCHES = [
  { label: "Black", value: "#0a0a0a" },
  { label: "Navy", value: "#0f172a" },
  { label: "Slate", value: "#1e293b" },
  { label: "Forest", value: "#14532d" },
  { label: "Burgundy", value: "#4c0519" },
  { label: "White", value: "#f8fafc" },
];

const ACCENT_SWATCHES = [
  { label: "Sky", value: "#0ea5e9" },
  { label: "Emerald", value: "#10b981" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Orange", value: "#f97316" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Gold", value: "#f59e0b" },
];

const LAYOUT_OPTIONS = [
  {
    value: "minimal",
    label: "Minimal",
    description: "Centered, clean, photo small",
    preview: "⬜",
  },
  {
    value: "photo_forward",
    label: "Photo Forward",
    description: "Big hero, overlapping photo",
    preview: "🖼",
  },
  {
    value: "bold",
    label: "Bold",
    description: "Huge name, accent stripe",
    preview: "⬛",
  },
];

function ColorPicker({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  swatches: typeof PRESET_SWATCHES;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-10 w-12 rounded-xl border border-input shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: value }}
              aria-label={`Open ${label} picker`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 rounded-2xl" align="start">
            <HexColorPicker color={value} onChange={onChange} />
            <div className="mt-3 grid grid-cols-6 gap-1.5">
              {swatches.map((s) => (
                <button
                  key={s.value}
                  title={s.label}
                  onClick={() => onChange(s.value)}
                  className={cn(
                    "h-7 w-7 rounded-lg border-2 transition-transform hover:scale-110",
                    value === s.value ? "border-primary" : "border-transparent"
                  )}
                  style={{ backgroundColor: s.value }}
                />
              ))}
            </div>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
              }}
              className="mt-2 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs font-mono"
              maxLength={7}
              spellCheck={false}
            />
          </PopoverContent>
        </Popover>
        <span className="text-sm font-mono text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}

function PhotoUploader({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
  onRemove: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Too large", description: "Pick something under 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const res = await apiRequest("POST", "/api/upload", { dataUrl });
      const data = await res.json();
      onChange(`${API_BASE}${data.url}`);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <div
            className="h-16 w-16 rounded-xl bg-secondary overflow-hidden border border-border"
            style={{ backgroundImage: `url(${value})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center border border-dashed border-border">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DesignTab() {
  const { card, setCard } = useAuth();
  const { toast } = useToast();

  const [layout, setLayout] = useState(card?.layoutStyle || "minimal");
  const [bgColor, setBgColor] = useState(card?.backgroundColor || "#0a0a0a");
  const [accentColor, setAccentColor] = useState(card?.accentColor || "#0ea5e9");
  const [textColor, setTextColor] = useState(card?.textColor || "#ffffff");
  const [bgPhoto, setBgPhoto] = useState<string | null>(card?.backgroundPhotoUrl || null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(card?.profilePhotoUrl || null);

  const [saving, setSaving] = useState(false);

  const previewCard = {
    ...(card || {}),
    layoutStyle: layout,
    backgroundColor: bgColor,
    accentColor,
    textColor,
    backgroundPhotoUrl: bgPhoto,
    profilePhotoUrl: profilePhoto,
  };

  // Debounced auto-save
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(
    async (patch: Record<string, string | null>) => {
      setSaving(true);
      try {
        const res = await apiRequest("PATCH", "/api/cards/me", patch);
        const data = await res.json();
        setCard(data.card);
      } catch (err: any) {
        toast({ title: "Auto-save failed", description: err.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    },
    [setCard, toast]
  );

  function scheduleSave(patch: Record<string, string | null>) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => doSave(patch), 500);
  }

  // Watch all design values and auto-save
  useEffect(() => {
    scheduleSave({
      layoutStyle: layout,
      backgroundColor: bgColor,
      accentColor,
      textColor,
      backgroundPhotoUrl: bgPhoto,
      profilePhotoUrl: profilePhoto,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, bgColor, accentColor, textColor, bgPhoto, profilePhoto]);

  const vcardUrl = card ? `${API_BASE}/api/cards/${card.slug}/vcard` : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Design</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your card's look. Changes save automatically.
          </p>
        </div>
        {saving && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr,360px] gap-8">
        {/* Controls */}
        <div className="space-y-8 order-2 md:order-1">
          {/* Layout picker */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Layout
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLayout(opt.value)}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-center transition-all hover:border-primary/50",
                    layout === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  )}
                >
                  <div className="text-2xl mb-2">{opt.preview}</div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Colors
            </h3>
            <ColorPicker
              label="Background color"
              value={bgColor}
              onChange={setBgColor}
              swatches={PRESET_SWATCHES}
            />
            <ColorPicker
              label="Accent color"
              value={accentColor}
              onChange={setAccentColor}
              swatches={ACCENT_SWATCHES}
            />
            <ColorPicker
              label="Text color"
              value={textColor}
              onChange={setTextColor}
              swatches={[
                { label: "White", value: "#ffffff" },
                { label: "Soft white", value: "#f1f5f9" },
                { label: "Light gray", value: "#cbd5e1" },
                { label: "Dark gray", value: "#334155" },
                { label: "Near-black", value: "#0f172a" },
                { label: "Black", value: "#000000" },
              ]}
            />
          </div>

          {/* Photos */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Photos
            </h3>
            <PhotoUploader
              label="Profile photo"
              value={profilePhoto}
              onChange={setProfilePhoto}
              onRemove={() => setProfilePhoto(null)}
            />
            <PhotoUploader
              label="Background photo"
              value={bgPhoto}
              onChange={setBgPhoto}
              onRemove={() => setBgPhoto(null)}
            />
          </div>
        </div>

        {/* Live preview */}
        <div className="order-1 md:order-2 md:sticky md:top-24 self-start">
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">
            Live preview
          </p>
          <CardPreview card={previewCard as any} vcardUrl={vcardUrl} />
        </div>
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
