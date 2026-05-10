import type { TitleDetail } from "@/lib/types";
import { ProviderButton } from "@/components/title/ProviderButton";
import { UnavailableBanner } from "@/components/title/UnavailableBanner";

const sections = [
  ["subscription", "Subscription"],
  ["rent", "Rent"],
  ["buy", "Buy"],
  ["free", "Free"],
] as const;

export function ProviderList({ title }: { title: TitleDetail }) {
  if (!title.providers.length) return <UnavailableBanner title={title} />;
  return (
    <section className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
      <h2 className="text-xl font-semibold">Watch in India</h2>
      <div className="mt-4 grid gap-5">
        {sections.map(([key, label]) => {
          const providers = title.providers_grouped[key];
          if (!providers.length) return null;
          return (
            <div key={key}>
              <h3 className="mb-2 font-mono text-xs font-medium uppercase text-text-muted">{label}</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {providers.map((provider) => <ProviderButton key={`${provider.id}-${provider.type}`} provider={provider} title={title} />)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-border-subtle pt-3 text-xs text-text-muted">
        <span>Powered by JustWatch</span>
        <img src="/logos/justwatch.svg" alt="JustWatch" className="h-5 w-auto rounded-[6px]" />
      </div>
    </section>
  );
}
