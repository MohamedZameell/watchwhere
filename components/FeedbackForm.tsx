"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TitleType } from "@/lib/types";

export type FeedbackFormProps = {
  tmdbId?: number;
  type?: TitleType;
  providerId?: string;
  onDone?: () => void;
};

export function FeedbackForm({ tmdbId = 1, type = "movie", providerId, onDone }: FeedbackFormProps) {
  const [issue, setIssue] = useState<"wrong-link" | "missing" | "other">(providerId ? "wrong-link" : "other");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tmdbId, type, providerId, issue, note, email: email || undefined }),
        }).catch(() => null);
        setLoading(false);
        if (response?.ok) {
          toast.success("Thanks. We'll check it.");
          onDone?.();
        } else {
          const body = await response?.json().catch(() => null);
          toast.error(body?.message || "Couldn't send that. Mind retrying?");
        }
      }}
    >
      <select
        value={issue}
        onChange={(event) => setIssue(event.target.value as "wrong-link" | "missing" | "other")}
        className="h-10 rounded-[6px] border border-border-default bg-bg-elevated px-3 text-sm text-text-primary"
      >
        <option value="wrong-link">Wrong link</option>
        <option value="missing">Missing provider</option>
        <option value="other">Other</option>
      </select>
      <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email address" />
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="What should we fix?"
        className="min-h-28 rounded-[6px] border border-border-default bg-bg-elevated p-3 text-sm text-text-primary placeholder:text-text-muted"
      />
      <Button type="submit" variant="primary" disabled={loading}>{loading ? "Sending" : "Send feedback"}</Button>
    </form>
  );
}
