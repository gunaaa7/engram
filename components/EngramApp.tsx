"use client";

import {
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";

import { EntryCard } from "@/components/EntryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatEntryDate } from "@/lib/utils";
import type { Entry, QueryResponse } from "@/lib/types";

type ApiError = {
  error?: string;
};

type ChatTurn = {
  id: string;
  answer: string;
  createdAt: string;
  question: string;
  sources: Entry[];
  state: "loading" | "complete" | "error";
};

const EMPTY_QUERY_STATE: QueryResponse = {
  answer: "",
  sources: [],
};

const PROMPT_SUGGESTIONS = [
  "What did I promise to follow up on this week?",
  "Summarize the ideas I captured around product direction.",
  "Which personal tasks have I mentioned recently?",
];

const CAPTURE_SUGGESTIONS = [
  "Client asked for a cleaner onboarding flow with fewer steps.",
  "Need to renew the insurance paperwork before Friday.",
  "Interesting angle: memory should feel like chatting, not filtering.",
];

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error || "Request failed.";
  } catch {
    return "Request failed.";
  }
}

function buildTurnTitle(question: string) {
  if (question.length <= 44) {
    return question;
  }

  return `${question.slice(0, 41)}...`;
}

function getSourceLabel(entry: Entry) {
  const source = entry.source.trim();
  return source ? source : "memory";
}

function EmptyThread({
  entriesCount,
  onPromptClick,
}: {
  entriesCount: number;
  onPromptClick: (value: string) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <Badge className="bg-cyan-400/12 text-cyan-100" variant="outline">
        Memory-linked assistant
      </Badge>
      <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
        Chat with everything you chose to remember.
      </h1>
      <p className="mt-4 max-w-2xl text-balance text-sm leading-7 text-slate-300 sm:text-base">
        Engram should feel closer to a modern LLM workspace than a notes
        dashboard. Ask naturally, browse prior prompts from the sidebar, and
        keep raw memories nearby when you need to ground an answer.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-400">
        <span>{entriesCount} saved memories</span>
        <span className="h-1 w-1 rounded-full bg-white/20" />
        <span>Threaded replies</span>
        <span className="h-1 w-1 rounded-full bg-white/20" />
        <span>Inline references</span>
      </div>
      <div className="mt-10 grid w-full gap-3 text-left sm:grid-cols-3">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            className="rounded-[1.7rem] border border-white/10 bg-white/6 p-4 transition hover:border-cyan-300/25 hover:bg-cyan-400/8"
            key={suggestion}
            onClick={() => onPromptClick(suggestion)}
            type="button"
          >
            <p className="text-sm font-medium text-white">{suggestion}</p>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Send this as your opening prompt.
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThreadMessage({
  active,
  turn,
  onSelect,
}: {
  active: boolean;
  turn: ChatTurn;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className={cn(
            "max-w-2xl rounded-[1.9rem] rounded-br-md border px-5 py-4 text-left shadow-[0_18px_50px_rgba(5,10,20,0.28)] transition",
            active
              ? "border-cyan-300/35 bg-cyan-400/12"
              : "border-white/10 bg-white/7 hover:border-white/20 hover:bg-white/10",
          )}
          onClick={() => onSelect(turn.id)}
          type="button"
        >
          <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
            <span>You</span>
            <span>{formatEntryDate(turn.createdAt)}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white sm:text-[0.95rem]">
            {turn.question}
          </p>
        </button>
      </div>

      <div className="flex justify-start">
        <button
          className={cn(
            "max-w-3xl rounded-[1.9rem] rounded-bl-md border px-5 py-4 text-left shadow-[0_18px_50px_rgba(5,10,20,0.28)] transition",
            active
              ? "border-white/16 bg-[rgba(13,18,29,0.92)]"
              : "border-white/10 bg-[rgba(10,15,25,0.82)] hover:border-white/16 hover:bg-[rgba(12,18,30,0.92)]",
          )}
          onClick={() => onSelect(turn.id)}
          type="button"
        >
          <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
            <span>Engram</span>
            <span>
              {turn.state === "loading"
                ? "Searching memory..."
                : turn.state === "error"
                  ? "Query failed"
                  : `${turn.sources.length} references`}
            </span>
          </div>
          {turn.state === "loading" ? (
            <div className="mt-4 space-y-3">
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/12" />
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/8" />
            </div>
          ) : (
            <>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-100 sm:text-[0.95rem]">
                {turn.answer}
              </p>
              {turn.sources.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {turn.sources.map((source) => (
                    <span
                      className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300"
                      key={source.id}
                    >
                      {getSourceLabel(source)}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ComposerCard({
  captureDraft,
  captureError,
  isCaptureOpen,
  isQuerying,
  isSaving,
  onCaptureDraftChange,
  onQueryDraftChange,
  onQuerySubmit,
  onSaveEntry,
  onToggleCapture,
  queryDraft,
  queryError,
}: {
  captureDraft: string;
  captureError: string | null;
  isCaptureOpen: boolean;
  isQuerying: boolean;
  isSaving: boolean;
  onCaptureDraftChange: (value: string) => void;
  onQueryDraftChange: (value: string) => void;
  onQuerySubmit: (questionOverride?: string) => void;
  onSaveEntry: () => void;
  onToggleCapture: () => void;
  queryDraft: string;
  queryError: string | null;
}) {
  return (
    <div className="border-t border-white/10 bg-[rgba(4,8,16,0.78)] px-3 py-3 backdrop-blur-2xl sm:px-5 sm:py-4">
      <div className="mx-auto w-full max-w-4xl space-y-3">
        {isCaptureOpen ? (
          <div className="rounded-[1.8rem] border border-white/10 bg-[rgba(10,15,25,0.9)] p-4 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">
                  Quick capture
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Save a thought without leaving the thread.
                </p>
              </div>
              <Badge variant="outline">Memory drawer</Badge>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void onSaveEntry();
              }}
            >
              <Textarea
                className="min-h-28 resize-none"
                onChange={(event) => onCaptureDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void onSaveEntry();
                  }
                }}
                placeholder="Capture something that should be available in future chats..."
                value={captureDraft}
              />
              <div className="flex flex-wrap gap-2">
                {CAPTURE_SUGGESTIONS.map((suggestion) => (
                  <button
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:bg-white/10"
                    key={suggestion}
                    onClick={() => onCaptureDraftChange(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              {captureError ? (
                <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {captureError}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <p>Press Enter to save, Shift+Enter for a new line.</p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onToggleCapture}
                    type="button"
                    variant="ghost"
                  >
                    Close
                  </Button>
                  <Button disabled={isSaving} type="submit">
                    {isSaving ? "Saving..." : "Save memory"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        ) : null}

        <form
          className="rounded-[1.9rem] border border-white/10 bg-[rgba(11,16,26,0.92)] p-3 shadow-[0_25px_80px_rgba(2,6,23,0.42)] sm:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onQuerySubmit();
          }}
        >
          <Textarea
            className="min-h-24 resize-none border-transparent bg-transparent px-1 py-1 text-[0.95rem] leading-7 focus:border-transparent focus:bg-transparent"
            onChange={(event) => onQueryDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onQuerySubmit();
              }
            }}
            placeholder="Ask about a person, commitment, idea, or detail from memory..."
            value={queryDraft}
          />
          {queryError ? (
            <p className="mt-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {queryError}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
                  key={suggestion}
                  onClick={() => {
                    onQueryDraftChange(suggestion);
                    void onQuerySubmit(suggestion);
                  }}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={onToggleCapture}
                type="button"
                variant="ghost"
              >
                {isCaptureOpen ? "Hide memory drawer" : "Capture memory"}
              </Button>
              <Button disabled={isQuerying} type="submit">
                {isQuerying ? "Thinking..." : "Send"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EngramApp() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [captureDraft, setCaptureDraft] = useState("");
  const [queryDraft, setQueryDraft] = useState("");
  const [queryState, setQueryState] = useState<QueryResponse>(EMPTY_QUERY_STATE);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      try {
        const response = await fetch("/api/entries", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        const data = (await response.json()) as Entry[];

        if (!cancelled) {
          startTransition(() => {
            setEntries(data);
          });
        }
      } catch (error) {
        console.error("Failed to load entries:", error);

        if (!cancelled) {
          setCaptureError(
            error instanceof Error ? error.message : "Failed to load entries.",
          );
        }
      } finally {
        if (!cancelled) {
          setEntriesLoading(false);
        }
      }
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [turns]);

  const activeTurn =
    turns.find((turn) => turn.id === activeTurnId) ?? turns[turns.length - 1];

  async function handleSaveEntry() {
    const content = captureDraft.trim();

    if (!content) {
      return;
    }

    setCaptureError(null);

    if (content.length < 10) {
      setCaptureError("Entries must be at least 10 characters.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const entry = (await response.json()) as Entry;

      startTransition(() => {
        setEntries((currentEntries) => [entry, ...currentEntries]);
      });

      setCaptureDraft("");
      setIsCaptureOpen(false);
    } catch (error) {
      console.error("Failed to save entry:", error);
      setCaptureError(
        error instanceof Error ? error.message : "Failed to save entry.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEntry(id: string) {
    const target = entries.find((entry) => entry.id === id);

    if (!target) {
      return;
    }

    const confirmed = window.confirm(
      `Delete this memory?\n\n"${target.content}"`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setCaptureError(null);

    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      startTransition(() => {
        setEntries((currentEntries) =>
          currentEntries.filter((entry) => entry.id !== id),
        );
        setTurns((currentTurns) =>
          currentTurns.map((turn) => ({
            ...turn,
            sources: turn.sources.filter((entry) => entry.id !== id),
          })),
        );
        setQueryState((currentState) => ({
          ...currentState,
          sources: currentState.sources.filter((entry) => entry.id !== id),
        }));
      });
    } catch (error) {
      console.error("Failed to delete entry:", error);
      setCaptureError(
        error instanceof Error ? error.message : "Failed to delete entry.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmitQuery(questionOverride?: string) {
    const question = (questionOverride ?? queryDraft).trim();

    if (!question) {
      setQueryError("Ask a question before sending the message.");
      return;
    }

    if (isQuerying) {
      return;
    }

    const turnId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    setQueryError(null);
    setIsQuerying(true);
    setQueryDraft("");

    startTransition(() => {
      setTurns((currentTurns) => [
        ...currentTurns,
        {
          id: turnId,
          answer: "",
          createdAt,
          question,
          sources: [],
          state: "loading",
        },
      ]);
      setActiveTurnId(turnId);
    });

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = (await response.json()) as QueryResponse;

      startTransition(() => {
        setTurns((currentTurns) =>
          currentTurns.map((turn) =>
            turn.id === turnId
              ? {
                  ...turn,
                  answer: data.answer,
                  sources: data.sources,
                  state: "complete",
                }
              : turn,
          ),
        );
        setQueryState(data);
      });
    } catch (error) {
      console.error("Failed to query entries:", error);

      const message =
        error instanceof Error ? error.message : "Failed to query entries.";

      setQueryError(message);

      startTransition(() => {
        setTurns((currentTurns) =>
          currentTurns.map((turn) =>
            turn.id === turnId
              ? {
                  ...turn,
                  answer: message,
                  state: "error",
                }
              : turn,
          ),
        );
      });
    } finally {
      setIsQuerying(false);
    }
  }

  function handleResetConversation() {
    setTurns([]);
    setActiveTurnId(null);
    setQueryDraft("");
    setQueryError(null);
    setQueryState(EMPTY_QUERY_STATE);
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
      <div className="grid h-full w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)_22rem]">
        <aside className="glass-panel hidden min-h-0 flex-col overflow-hidden lg:flex">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Engram
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  Memory chat
                </h2>
              </div>
              <Badge variant="outline">{entries.length} memories</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              A chat-first shell for captured notes and retrieval.
            </p>
            <Button
              className="mt-5 w-full justify-center"
              onClick={handleResetConversation}
              type="button"
              variant="ghost"
            >
              New chat
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <section>
              <p className="px-2 text-xs uppercase tracking-[0.28em] text-slate-500">
                Recent chats
              </p>
              <div className="mt-3 space-y-2">
                {turns.length > 0 ? (
                  [...turns].reverse().map((turn) => (
                    <button
                      className={cn(
                        "w-full rounded-[1.4rem] border px-4 py-3 text-left transition",
                        activeTurnId === turn.id
                          ? "border-cyan-300/30 bg-cyan-400/10"
                          : "border-transparent bg-white/4 hover:border-white/10 hover:bg-white/8",
                      )}
                      key={turn.id}
                      onClick={() => setActiveTurnId(turn.id)}
                      type="button"
                    >
                      <p className="text-sm font-medium text-white">
                        {buildTurnTitle(turn.question)}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {formatEntryDate(turn.createdAt)}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm leading-6 text-slate-400">
                    No thread yet. Your first question becomes the start of the
                    conversation history.
                  </div>
                )}
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center justify-between gap-3 px-2">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Memory bank
                </p>
                <button
                  className="text-xs text-slate-400 transition hover:text-white"
                  onClick={() => setIsCaptureOpen(true)}
                  type="button"
                >
                  Capture
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {entriesLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      className="h-20 animate-pulse rounded-[1.5rem] border border-white/8 bg-white/5"
                      key={index}
                    />
                  ))
                ) : entries.length > 0 ? (
                  entries.slice(0, 6).map((entry) => (
                    <button
                      className="w-full rounded-[1.5rem] border border-transparent bg-white/4 px-4 py-3 text-left transition hover:border-white/10 hover:bg-white/8"
                      key={entry.id}
                      onClick={() => setQueryDraft(`What should I know about: ${entry.content}`)}
                      type="button"
                    >
                      <p className="line-clamp-2 text-sm leading-6 text-slate-200">
                        {entry.content}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatEntryDate(entry.created_at)}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm leading-6 text-slate-400">
                    Save a few memories to make the first chat feel useful.
                  </div>
                )}
              </div>
            </section>
          </div>
        </aside>

        <section className="glass-panel flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-white/10 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 lg:hidden">
                  <Badge variant="outline">Engram</Badge>
                  <Badge className="bg-cyan-400/10 text-cyan-100" variant="outline">
                    {entries.length} memories
                  </Badge>
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">
                  Chat with your memory
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Keep the center focused on conversation, keep retrieval
                  visible, and make capture feel like a lightweight side action.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {queryState.sources.length > 0
                    ? `${queryState.sources.length} refs in latest answer`
                    : "Grounded answers"}
                </Badge>
                <Button
                  className="lg:hidden"
                  onClick={() => setIsCaptureOpen((current) => !current)}
                  type="button"
                  variant="ghost"
                >
                  {isCaptureOpen ? "Hide capture" : "Capture"}
                </Button>
              </div>
            </div>

            {turns.length > 0 ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {[...turns].reverse().map((turn) => (
                  <button
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-2 text-xs transition",
                      activeTurnId === turn.id
                        ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                        : "border-white/10 bg-white/5 text-slate-300",
                    )}
                    key={turn.id}
                    onClick={() => setActiveTurnId(turn.id)}
                    type="button"
                  >
                    {buildTurnTitle(turn.question)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {turns.length === 0 ? (
              <EmptyThread
                entriesCount={entries.length}
                onPromptClick={(value) => void handleSubmitQuery(value)}
              />
            ) : (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-2">
                {turns.map((turn) => (
                  <ThreadMessage
                    active={activeTurn?.id === turn.id}
                    key={turn.id}
                    onSelect={setActiveTurnId}
                    turn={turn}
                  />
                ))}
                <div ref={threadEndRef} />
              </div>
            )}
          </div>

          <ComposerCard
            captureDraft={captureDraft}
            captureError={captureError}
            isCaptureOpen={isCaptureOpen}
            isQuerying={isQuerying}
            isSaving={isSaving}
            onCaptureDraftChange={setCaptureDraft}
            onQueryDraftChange={setQueryDraft}
            onQuerySubmit={handleSubmitQuery}
            onSaveEntry={handleSaveEntry}
            onToggleCapture={() => setIsCaptureOpen((current) => !current)}
            queryDraft={queryDraft}
            queryError={queryError}
          />
        </section>

        <aside className="glass-panel hidden min-h-0 flex-col overflow-hidden xl:flex">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Context rail
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  Retrieved memory
                </h2>
              </div>
              <Badge variant="outline">
                {activeTurn?.sources.length ?? 0} notes
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Keep evidence visible beside the assistant reply, similar to a
              modern citations pane.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <section className="rounded-[1.8rem] border border-white/10 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    Quick capture
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Save context while the conversation is still open.
                  </p>
                </div>
                <Badge variant="outline">Always on</Badge>
              </div>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSaveEntry();
                }}
              >
                <Textarea
                  className="min-h-28 resize-none"
                  onChange={(event) => setCaptureDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSaveEntry();
                    }
                  }}
                  placeholder="Write a memory you want available in future answers..."
                  value={captureDraft}
                />
                {captureError ? (
                  <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {captureError}
                  </p>
                ) : null}
                <Button className="w-full justify-center" disabled={isSaving} type="submit">
                  {isSaving ? "Saving..." : "Save memory"}
                </Button>
              </form>
            </section>

            <section className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Active references
                </p>
                {activeTurn ? (
                  <button
                    className="text-xs text-slate-400 transition hover:text-white"
                    onClick={() => setActiveTurnId(activeTurn.id)}
                    type="button"
                  >
                    Focus answer
                  </button>
                ) : null}
              </div>

              {activeTurn?.sources.length ? (
                <div className="space-y-3">
                  {activeTurn.sources.map((entry) => (
                    <EntryCard entry={entry} key={entry.id} tone="source" />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.8rem] border border-dashed border-white/10 bg-white/4 px-5 py-10 text-center text-sm leading-6 text-slate-400">
                  Run a memory query and the supporting notes will appear here.
                </div>
              )}
            </section>

            <section className="mt-4 rounded-[1.8rem] border border-white/10 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Recent memories</p>
                <Badge variant="outline">{entries.length}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {entriesLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      className="h-24 animate-pulse rounded-[1.5rem] border border-white/8 bg-white/5"
                      key={index}
                    />
                  ))
                ) : entries.length > 0 ? (
                  entries.slice(0, 3).map((entry) => (
                    <EntryCard
                      deleting={deletingId === entry.id}
                      entry={entry}
                      key={entry.id}
                      onDelete={handleDeleteEntry}
                    />
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-400">
                    No saved memories yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
