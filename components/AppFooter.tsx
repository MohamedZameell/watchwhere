import Link from "next/link";

const columns = [
  { title: "Brand", links: [{ label: "Watchwhere", href: "/" }] },
  {
    title: "Product",
    links: [
      { label: "Search", href: "/search" },
      { label: "Browse", href: "/browse" },
      { label: "About", href: "/about" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Feedback", href: "/about#feedback" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Attribution", href: "/about#attribution" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="mt-20 border-t border-border-subtle">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="font-mono text-xs font-medium uppercase text-text-muted">{column.title}</h2>
            <div className="mt-4 grid gap-2 text-sm text-text-secondary">
              {column.links.map((link) => (
                <Link key={link.href} href={link.href} className="transition duration-150 ease-out hover:text-text-primary">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="container-page border-t border-border-subtle py-5 text-xs text-text-muted">
        TMDB data and Streaming availability data powered by JustWatch.
      </div>
    </footer>
  );
}
