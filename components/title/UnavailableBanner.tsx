"use client";

import { BellOff } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TitleDetail } from "@/lib/types";

export function UnavailableBanner({ title }: { title: TitleDetail }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <section className="rounded-[12px] border border-border-default bg-bg-elevated p-5">
      <BellOff aria-hidden="true" className="size-7 text-accent" />
      <h2 className="mt-4 text-xl font-semibold">Not on any Indian OTT right now.</h2>
      <p className="mt-2 text-sm text-text-secondary">We&apos;ll let you know when this changes.</p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          const response = await fetch("/api/feedback", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tmdbId: title.tmdb_id, type: title.type, issue: "missing", note: email, email }),
          }).catch(() => null);
          setLoading(false);
          if (response?.ok) toast.success("Got it.");
          else toast.error("Couldn't send that. Mind retrying?");
        }}
      >
        <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" />
        <Button type="submit" variant="primary" disabled={loading}>{loading ? "Sending" : "Notify me"}</Button>
      </form>
    </section>
  );
}
