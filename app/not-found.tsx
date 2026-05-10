import { SearchBar } from "@/components/ui/SearchBar";

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[60dvh] content-center py-16">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-medium uppercase text-text-muted">404</p>
        <h1 className="tracking-display mt-3 text-balance font-display text-4xl font-bold sm:text-5xl">We couldn&apos;t find that title.</h1>
        <div className="mt-6">
          <SearchBar />
        </div>
      </div>
    </div>
  );
}
