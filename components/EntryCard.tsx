import { Button } from "@/components/ui/button";
import { cn, formatEntryDate } from "@/lib/utils";
import type { Entry } from "@/lib/types";

type EntryCardProps = {
  deleting?: boolean;
  entry: Entry;
  onDelete?: (id: string) => void;
  tone?: "default" | "source";
};

export function EntryCard({
  deleting = false,
  entry,
  onDelete,
  tone = "default",
}: EntryCardProps) {
  return (
    <article
      className={cn(
        "rounded-[1.75rem] border p-4 transition sm:p-5",
        tone === "source"
          ? "border-sky-400/20 bg-sky-500/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/7",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-slate-300">
            {formatEntryDate(entry.created_at)}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
            {entry.content}
          </p>
        </div>
        {onDelete ? (
          <Button
            disabled={deleting}
            onClick={() => onDelete(entry.id)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
