"use client";

import { EntryCard } from "@/components/EntryCard";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Entry } from "@/lib/types";

type CapturePanelProps = {
  captureDraft: string;
  deletingId: string | null;
  entries: Entry[];
  entriesLoading: boolean;
  error: string | null;
  isSaving: boolean;
  onCaptureDraftChange: (value: string) => void;
  onDeleteEntry: (id: string) => void;
  onSaveEntry: () => void;
};

export function CapturePanel({
  captureDraft,
  deletingId,
  entries,
  entriesLoading,
  error,
  isSaving,
  onCaptureDraftChange,
  onDeleteEntry,
  onSaveEntry,
}: CapturePanelProps) {
  return (
    <Card className="panel-surface flex min-h-[42rem] flex-1 flex-col border-white/10">
      <CardHeader className="gap-4 border-b border-white/10 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="secondary">Capture</Badge>
            <CardTitle className="text-2xl text-white">
              Save a note.
            </CardTitle>
            <CardDescription className="max-w-xl text-slate-300">
              Add anything you want to remember.
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            {entries.length} saved
          </Badge>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveEntry();
          }}
        >
          <Textarea
            autoFocus
            className="min-h-28 resize-none"
            onChange={(event) => onCaptureDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSaveEntry();
              }
            }}
            placeholder="Mom asked me to call Priya on Sunday about the medical forms..."
            value={captureDraft}
          />
          <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
            <p>Enter to save. Shift+Enter for a new line.</p>
            <button
              className="rounded-full border border-sky-400/30 bg-sky-500/15 px-4 py-2 font-medium text-sky-100 transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              suppressHydrationWarning
              type="submit"
            >
              {isSaving ? "Saving..." : "Save note"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">
              Notes
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Newest first.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {entriesLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/5"
                />
              ))}
            </div>
          ) : entries.length > 0 ? (
            <div className="grid gap-3">
              {entries.map((entry) => (
                <EntryCard
                  deleting={deletingId === entry.id}
                  entry={entry}
                  key={entry.id}
                  onDelete={onDeleteEntry}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 px-5 py-10 text-center text-sm text-slate-300">
              No notes yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
