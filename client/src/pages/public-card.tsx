import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { CardPreview } from "@/components/card-preview";
import { API_BASE } from "@/lib/queryClient";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { AuthCard } from "@/lib/auth";

export default function PublicCard() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useQuery<{ card: AuthCard }>({
    queryKey: ["/api/cards/by-slug", slug],
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {isLoading && (
            <div className="rounded-3xl border border-card-border bg-card p-8 space-y-5">
              <Skeleton className="h-32 w-32 rounded-full mx-auto" />
              <Skeleton className="h-6 w-40 mx-auto" />
              <Skeleton className="h-4 w-56 mx-auto" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-11 rounded-xl" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
            </div>
          )}

          {isError && (
            <div className="rounded-3xl border border-card-border bg-card p-10 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Card not found</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn't find a card at <code>/c/{slug}</code>.
              </p>
              <Link href="/">
                <Button variant="outline" className="mt-6 rounded-xl" data-testid="button-back-home">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to TapCard
                </Button>
              </Link>
            </div>
          )}

          {data?.card && (
            <CardPreview
              card={data.card}
              vcardUrl={`${API_BASE}/api/cards/${data.card.slug}/vcard`}
            />
          )}
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        <Link href="/" data-testid="link-powered-by">
          <span className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
            Powered by <Logo className="text-foreground text-sm" />
          </span>
        </Link>
      </footer>
    </div>
  );
}
