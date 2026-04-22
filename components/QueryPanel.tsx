"use client";

import { AnswerCard } from "@/components/AnswerCard";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Entry } from "@/lib/types";

type QueryPanelProps = {
  answer: string;
  error: string | null;
  isQuerying: boolean;
  lastQuestion: string;
  onQueryDraftChange: (value: string) => void;
  onSubmitQuery: (questionOverride?: string) => void;
  queryDraft: string;
  sources: Entry[];
};

const SUGGESTIONS = [
  "What did Mom ask me to do recently?",
  "What tasks am I behind on?",
  "What ideas have I saved lately?",
];

export function QueryPanel({
  answer,
  error,
  isQuerying,
  lastQuestion,
  onQueryDraftChange,
  onSubmitQuery,
  queryDraft,
  sources,
}: QueryPanelProps) {
  return (
    <Card className="panel-surface flex min-h-[42rem] flex-1 flex-col border-white/10">
      <CardHeader className="gap-4 border-b border-white/10 pb-5">
        <div className="space-y-2">
          <Badge variant="secondary">Query</Badge>
          <CardTitle className="text-2xl text-white">
            Ask anything.
          </CardTitle>
          <CardDescription className="max-w-xl text-slate-300">
            Search your notes in plain language.
          </CardDescription>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmitQuery();
          }}
        >
          <Input
            onChange={(event) => onQueryDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onSubmitQuery();
              }
            }}
            placeholder="What did Mom ask me to do this month?"
            value={queryDraft}
          />
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-200 transition hover:border-sky-300/35 hover:bg-sky-500/10"
                key={suggestion}
                onClick={() => {
                  onQueryDraftChange(suggestion);
                  void onSubmitQuery(suggestion);
                }}
                suppressHydrationWarning
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
          {error ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          <div className="text-xs text-slate-400">Enter to search.</div>
        </form>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-6">
        <AnswerCard
          answer={answer}
          isLoading={isQuerying}
          lastQuestion={lastQuestion}
          sources={sources}
        />
      </CardContent>
    </Card>
  );
}
