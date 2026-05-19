import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import {
  Sparkles,
  Nfc,
  ContactRound,
  ArrowRight,
  Mail,
  Phone,
  Globe,
  Linkedin,
} from "lucide-react";

function MockCard() {
  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border border-card-border bg-card p-8 text-center">
      <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 ring-4 ring-sky-100 dark:ring-sky-900/40 flex items-center justify-center text-white text-3xl font-bold">
        AR
      </div>
      <h3 className="mt-5 text-xl font-bold">Ava Reyes</h3>
      <p className="text-sm text-muted-foreground">
        Product Designer · Northstar
      </p>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Designing tools that feel inevitable.
      </p>
      <button
        className="mt-6 w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm"
        disabled
      >
        Save to Contacts
      </button>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[Phone, Mail, Globe, Linkedin].map((Icon, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl border border-card-border flex items-center justify-center text-muted-foreground"
          >
            <Icon className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard">
                <Button data-testid="button-dashboard">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" data-testid="button-login">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button data-testid="button-signup">Get started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Free forever — no subscriptions
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Your business card.
              <br />
              <span className="text-primary">One tap away.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg leading-relaxed">
              Create a free digital business card. Program any NFC tag you already own. Tap to share — your contact info auto-saves to their phone.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={user ? "/dashboard" : "/signup"}>
                <Button size="lg" className="text-base" data-testid="button-cta-start">
                  {user ? "Go to Dashboard" : "Get Started Free"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              {!user && (
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base"
                    data-testid="button-cta-login"
                  >
                    I already have an account
                  </Button>
                </Link>
              )}
            </div>

            <div className="mt-12 grid sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Sparkles,
                  title: "Free forever",
                  body: "No paywalls, no upgrades. Unlimited taps.",
                },
                {
                  icon: Nfc,
                  title: "Any NFC tag",
                  body: "Sticker, ring, card — works with what you own.",
                },
                {
                  icon: ContactRound,
                  title: "Auto-saves",
                  body: "One tap downloads a vCard to their phone.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-card-border bg-card p-5"
                >
                  <div className="h-9 w-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 font-semibold text-sm">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-tr from-sky-100 via-cyan-50 to-transparent dark:from-sky-950/30 dark:via-cyan-950/20 rounded-3xl blur-2xl -z-10" />
            <MockCard />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Live preview · This is what visitors will see when they tap your tag.
            </p>
          </div>
        </div>

        <section className="mt-28 rounded-3xl border border-card-border bg-card p-10 lg:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-8">
            {[
              {
                n: "01",
                title: "Build your card",
                body: "Add your name, role, links, and photo. Pick an accent color.",
              },
              {
                n: "02",
                title: "Get your URL",
                body: "We give you a clean public link like tapcard.app/c/your-slug.",
              },
              {
                n: "03",
                title: "Write your NFC tag",
                body: "Use any NFC writer app to program your link onto a tag.",
              },
            ].map((s) => (
              <div key={s.n}>
                <div className="text-sm font-mono text-primary">{s.n}</div>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between text-sm text-muted-foreground">
          <Logo className="text-foreground" />
          <span>© TapCard. Made for tapping.</span>
        </div>
      </footer>
    </div>
  );
}
