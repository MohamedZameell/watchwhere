import Image from "next/image";
import { UserRound } from "lucide-react";
import { tmdbImage } from "@/lib/images";
import type { TitleDetail } from "@/lib/types";

export function CastStrip({ cast }: { cast: TitleDetail["cast"] }) {
  if (!cast.length) return null;
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">Cast</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {cast.map((person) => {
          const image = tmdbImage(person.profile_path, "w185");
          return (
            <div key={person.id} className="w-32 shrink-0">
              <div className="relative aspect-[2/3] overflow-hidden rounded-[12px] border border-border-subtle bg-bg-elevated">
                {image ? <Image src={image} alt={person.name} fill quality={75} sizes="128px" className="object-cover" /> : <UserRound aria-hidden="true" className="m-auto mt-16 size-8 text-text-muted" />}
              </div>
              <p className="mt-2 truncate text-sm font-medium">{person.name}</p>
              <p className="truncate text-xs text-text-muted">{person.character}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
