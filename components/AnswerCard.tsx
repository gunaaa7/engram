import { EntryCard } from "@/components/EntryCard";
import { Badge } from "@/components/ui/badge";
import type { Entry } from "@/lib/types";

type AnswerCardProps = {
  answer: string;
  isLoading: boolean;
  lastQuestion: string;
  sources: Entry[];
};

export function AnswerCard({
  answer,
  isLoading,
  lastQuestion,
  sources,
}: AnswerCardProps) {
  if (isLoading) {
    return (
      <div className="grid flex-1 gap-3">
        <div className="h-40 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/5" />
        <div className="h-28 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!answer) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 px-6 text-center text-sm leading-6 text-slate-300">
        Ask about a person, task, or idea you saved.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Answer</Badge>
          {lastQuestion ? (
            <p className="text-sm text-slate-300">
              Question:
              <span className="ml-2 text-white">{lastQuestion}</span>
            </p>
          ) : null}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-50">
          {answer}
        </p>
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">
              Related notes
            </h2>
          </div>
          <Badge variant="outline">{sources.length} notes</Badge>
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          {sources.length > 0 ? (
            <div className="grid gap-3">
              {sources.map((entry) => (
                <EntryCard entry={entry} key={entry.id} tone="source" />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 px-5 py-10 text-center text-sm text-slate-300">
              No related notes.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
