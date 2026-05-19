import { Link } from "wouter";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" data-testid="link-logo">
      <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="TapCard"
        >
          <rect
            x="3"
            y="7"
            width="26"
            height="18"
            rx="4"
            stroke="currentColor"
            strokeWidth="2.2"
            fill="none"
          />
          <path
            d="M20 14 a4 4 0 0 1 0 4"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M23 12 a8 8 0 0 1 0 8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="17" cy="16" r="1.6" fill="currentColor" />
        </svg>
        <span className="text-lg">TapCard</span>
      </span>
    </Link>
  );
}
