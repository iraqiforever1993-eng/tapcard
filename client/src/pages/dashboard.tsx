import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, API_BASE } from "@/lib/queryClient";
import { Logo } from "@/components/logo";
import { CardPreview } from "@/components/card-preview";
import {
  isNative,
  hapticTap,
  hapticSuccess,
  hapticError,
  writeUrlToNfcTag,
  pickPhotoDataUrl,
} from "@/lib/native";
import {
  LogOut,
  Save,
  Copy,
  Check,
  Upload,
  Loader2,
  ExternalLink,
  Nfc,
  Smartphone,
  Camera as CameraIcon,
} from "lucide-react";

const editSchema = z.object({
  slug: z
    .string()
    .min(3, "At least 3 characters")
    .max(30, "Max 30 characters")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  fullName: z.string().min(1, "Required").max(100),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  company: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().max(120).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  linkedin: z.string().max(200).optional().or(z.literal("")),
  twitter: z.string().max(200).optional().or(z.literal("")),
  instagram: z.string().max(200).optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a #hex color"),
  photoDataUrl: z.string().optional().or(z.literal("")),
});

type EditValues = z.infer<typeof editSchema>;

export default function Dashboard() {
  const { user, card, token } = useAuth();
  const [, navigate] = useLocation();

  if (!token || !user || !card) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/60">
          <div className="mx-auto max-w-6xl px-6 h-16 flex items-center">
            <Logo />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight">You’re signed out</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sessions don’t persist on page refresh in this demo — log back in to keep editing.
            </p>
            <Button
              className="mt-6 rounded-xl"
              onClick={() => navigate("/login")}
              data-testid="button-relogin"
            >
              Log in
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return <DashboardInner />;
}

function DashboardInner() {
  const { user, card, signOut, setCard } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [writingTag, setWritingTag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const native = isNative();

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      slug: card!.slug,
      fullName: card!.fullName || "",
      jobTitle: card!.jobTitle || "",
      company: card!.company || "",
      phone: card!.phone || "",
      email: card!.email || "",
      website: card!.website || "",
      linkedin: card!.linkedin || "",
      twitter: card!.twitter || "",
      instagram: card!.instagram || "",
      bio: card!.bio || "",
      accentColor: card!.accentColor || "#0ea5e9",
      photoDataUrl: card!.photoDataUrl || "",
    },
  });

  const watched = form.watch();
  const publicUrl = `${window.location.origin}/#/c/${watched.slug}`;

  useEffect(() => {
    if (!watched.slug) return;
    QRCode.toDataURL(publicUrl, {
      width: 256,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [publicUrl, watched.slug]);

  async function onSubmit(values: EditValues) {
    setSubmitting(true);
    try {
      // strip empty strings to null
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(values)) {
        payload[k] = v === "" ? null : v;
      }
      const res = await apiRequest("PATCH", "/api/cards/me", payload);
      const data = await res.json();
      setCard(data.card);
      toast({ title: "Card saved", description: "Your changes are live." });
    } catch (err: any) {
      toast({
        title: "Couldn't save",
        description: err.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Pick something under 5MB.",
        variant: "destructive",
      });
      return;
    }
    const dataUrl = await resizeImage(file, 400);
    form.setValue("photoDataUrl", dataUrl, { shouldDirty: true });
  }

  async function onPickPhotoNative() {
    try {
      await hapticTap();
      const dataUrl = await pickPhotoDataUrl();
      if (dataUrl) {
        form.setValue("photoDataUrl", dataUrl, { shouldDirty: true });
        await hapticSuccess();
      }
    } catch (err: any) {
      await hapticError();
      toast({
        title: "Couldn't open camera",
        description: err?.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  async function onWriteNfc() {
    if (writingTag) return;
    setWritingTag(true);
    try {
      await hapticTap();
      await writeUrlToNfcTag(publicUrl);
      await hapticSuccess();
      toast({
        title: "Tag written",
        description: "Tap it with any phone to share your card.",
      });
    } catch (err: any) {
      await hapticError();
      toast({
        title: "Couldn't write tag",
        description: err?.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setWritingTag(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  }

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  const vcardUrl = `${API_BASE}/api/cards/${watched.slug}/vcard`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 sticky top-0 bg-background/80 backdrop-blur z-20">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground" data-testid="text-user-email">
              {user!.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Your card
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Edit on the left. Live preview on the right.
            </p>
          </div>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={submitting}
            data-testid="button-save"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save changes
          </Button>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1fr,420px] gap-10">
          {/* LEFT: form */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8"
            >
              <Section title="Public URL">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-xl"
                          data-testid="input-slug"
                          onChange={(e) =>
                            field.onChange(e.target.value.toLowerCase())
                          }
                        />
                      </FormControl>
                      <FormDescription className="break-all">
                        {publicUrl}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section title="Photo & color">
                <div className="flex items-center gap-5">
                  <div
                    className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-secondary-foreground overflow-hidden"
                    style={
                      watched.photoDataUrl
                        ? {
                            backgroundImage: `url(${watched.photoDataUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    {!watched.photoDataUrl &&
                      (watched.fullName?.[0]?.toUpperCase() || "?")}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={onPhotoChange}
                      data-testid="input-photo"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        native ? onPickPhotoNative() : fileRef.current?.click()
                      }
                      data-testid="button-upload-photo"
                    >
                      {native ? (
                        <CameraIcon className="h-4 w-4 mr-1.5" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1.5" />
                      )}
                      {watched.photoDataUrl
                        ? native ? "Replace photo" : "Replace photo"
                        : native ? "Take or choose photo" : "Upload photo"}
                    </Button>
                    {watched.photoDataUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() =>
                          form.setValue("photoDataUrl", "", {
                            shouldDirty: true,
                          })
                        }
                        data-testid="button-remove-photo"
                      >
                        Remove
                      </Button>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Square works best. We resize to 400px.
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent color</FormLabel>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-10 w-14 rounded-xl border border-input bg-background cursor-pointer"
                          data-testid="input-color"
                        />
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-xl max-w-[160px]"
                            data-testid="input-color-hex"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section title="Identity">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-xl"
                          placeholder="Ava Reyes"
                          data-testid="input-fullname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-xl"
                            placeholder="Product Designer"
                            data-testid="input-jobtitle"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-xl"
                            placeholder="Northstar"
                            data-testid="input-company"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          className="rounded-xl"
                          placeholder="A short line about you."
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section title="Contact">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-xl"
                            placeholder="+1 555 123 4567"
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-xl"
                            placeholder="you@example.com"
                            data-testid="input-contact-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-xl"
                          placeholder="yoursite.com"
                          data-testid="input-website"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section title="Social">
                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-xl"
                          placeholder="linkedin.com/in/you"
                          data-testid="input-linkedin"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter / X</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-xl"
                            placeholder="x.com/you"
                            data-testid="input-twitter"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-xl"
                            placeholder="instagram.com/you"
                            data-testid="input-instagram"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Section>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="rounded-xl"
                  disabled={submitting}
                  data-testid="button-save-bottom"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  Save changes
                </Button>
              </div>
            </form>
          </Form>

          {/* RIGHT: preview + NFC */}
          <aside className="space-y-6 lg:sticky lg:top-24 self-start">
            <CardPreview card={watched as any} vcardUrl={vcardUrl} />

            <div className="rounded-2xl border border-card-border bg-card p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Nfc className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">NFC setup</h3>
                </div>
                {native && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    data-testid="badge-native-nfc"
                  >
                    <Smartphone className="h-3 w-3" />
                    Native NFC
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-secondary p-3 flex items-center gap-2">
                  <code
                    className="flex-1 text-xs break-all font-mono text-secondary-foreground"
                    data-testid="text-public-url"
                  >
                    {publicUrl}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyUrl}
                    data-testid="button-copy-url"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>

                {native && (
                  <Button
                    type="button"
                    onClick={onWriteNfc}
                    disabled={writingTag}
                    className="w-full rounded-xl"
                    data-testid="button-write-nfc"
                  >
                    {writingTag ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Nfc className="h-4 w-4 mr-1.5" />
                    )}
                    {writingTag ? "Hold tag to phone…" : "Write to NFC tag"}
                  </Button>
                )}

                <a
                  href={`#/c/${watched.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  data-testid="link-open-card"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open your public card
                </a>

                {qrDataUrl && (
                  <div className="mt-3 rounded-xl bg-white p-3 flex items-center justify-center">
                    <img
                      src={qrDataUrl}
                      alt="QR code"
                      className="h-44 w-44"
                      data-testid="img-qr"
                    />
                  </div>
                )}

                {!native && (
                  <ol className="mt-4 space-y-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
                    <li>Download an NFC writer app (NFC Tools on iOS or Android).</li>
                    <li>Copy the link above.</li>
                    <li>Write it to your NFC tag as a URL record.</li>
                    <li>Tap your tag with any phone to share.</li>
                  </ol>
                )}
                {native && (
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    Tap “Write to NFC tag”, then hold a blank NFC sticker or
                    card near the top of your phone. Anyone who taps the tag
                    afterwards will open your card.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function resizeImage(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No 2d ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
