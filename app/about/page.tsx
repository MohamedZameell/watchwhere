import type { Metadata } from "next";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "About - Watchwhere",
  description: "What Watchwhere is and how its data is attributed.",
};

export default function AboutPage() {
  return (
    <div className="container-page grid gap-10 py-10">
      <section className="max-w-3xl">
        <p className="font-mono text-xs font-medium uppercase text-text-muted">About</p>
        <h1 className="tracking-display mt-3 text-balance font-display text-4xl font-bold sm:text-5xl">One fast answer for where to watch.</h1>
        <p className="mt-5 text-pretty text-base leading-7 text-text-secondary">
          Watchwhere helps people in India search a title, compare availability, and open the right OTT destination without wandering through every app.
        </p>
      </section>

      <section id="attribution" className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Attribution</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <img src="/attribution/tmdb.svg" alt="TMDB" className="h-9 w-auto rounded-[8px]" />
            <img src="/attribution/justwatch.svg" alt="JustWatch" className="h-9 w-auto rounded-[8px]" />
          </div>
          <div className="mt-5 grid gap-2 text-sm leading-6 text-text-secondary">
            <p>&quot;This product uses the TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.&quot;</p>
            <p>&quot;Streaming availability data powered by JustWatch.&quot;</p>
            <p>&quot;Anime metadata via AniList.&quot;</p>
          </div>
        </Card>
        <Card id="feedback" className="p-5">
          <h2 className="text-xl font-semibold">Feedback</h2>
          <p className="mt-2 text-sm text-text-secondary">Found a bad link or missing provider? Send it over.</p>
          <div className="mt-4">
            <FeedbackForm />
          </div>
        </Card>
      </section>
    </div>
  );
}
