import type { TitleDetail } from "@/lib/types";

export function AnimeBlock({ anilist }: { anilist: TitleDetail["anilist"] }) {
  if (!anilist) return null;
  return (
    <section className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
      <h2 className="text-xl font-semibold">AniList</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="font-mono text-xs uppercase text-text-muted">Characters</h3>
          <p className="mt-2 text-sm text-text-secondary">{anilist.characters.length} featured</p>
        </div>
        <div>
          <h3 className="font-mono text-xs uppercase text-text-muted">Relations</h3>
          <p className="mt-2 text-sm text-text-secondary">{anilist.relations.length} connected titles</p>
        </div>
        <div>
          <h3 className="font-mono text-xs uppercase text-text-muted">External links</h3>
          <p className="mt-2 text-sm text-text-secondary">{anilist.externalLinks.length} sources</p>
        </div>
      </div>
    </section>
  );
}
