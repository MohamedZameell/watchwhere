import Link from "next/link";
import { Search } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-base/95">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent font-mono text-sm font-medium text-black">
            W
          </span>
          <span className="font-display text-lg font-semibold">Watchwhere</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm text-text-secondary sm:flex">
          <Link className="rounded-[8px] px-3 py-2 transition duration-150 ease-out hover:bg-bg-elevated hover:text-text-primary" href="/search">
            Search
          </Link>
          <Link className="rounded-[8px] px-3 py-2 transition duration-150 ease-out hover:bg-bg-elevated hover:text-text-primary" href="/browse">
            Browse
          </Link>
          <Link className="rounded-[8px] px-3 py-2 transition duration-150 ease-out hover:bg-bg-elevated hover:text-text-primary" href="/about">
            About
          </Link>
        </nav>
        <Link
          href="/search"
          aria-label="Open search"
          className="flex size-10 items-center justify-center rounded-[8px] border border-border-default bg-bg-elevated text-text-secondary transition duration-150 ease-out hover:border-border-strong hover:text-text-primary sm:hidden"
        >
          <Search aria-hidden="true" className="size-5" />
        </Link>
      </div>
    </header>
  );
}
