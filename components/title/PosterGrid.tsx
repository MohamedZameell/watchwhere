import type { SearchHit } from "@/lib/types";
import { PosterCard } from "@/components/title/PosterCard";

export function PosterGrid({ titles }: { titles: SearchHit[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {titles.map((title, index) => (
        <PosterCard key={title.id} title={title} priority={index < 6} />
      ))}
    </div>
  );
}
