"use client";

import Link from "next/link";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
} from "react";

import { logout } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatEntryDate } from "@/lib/utils";
import type { ChatThread, ChatTurn, Entry, QueryResponse } from "@/lib/types";

type ApiError = {
  error?: string;
};

type AppView = "memories" | "chat";
type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "engram-theme";
const THEME_CHANGE_EVENT = "engram-theme-change";

const PROMPT_SUGGESTIONS = [
  "What did I promise to follow up on this week?",
  "Summarize the ideas I captured around product direction.",
  "Which personal tasks have I mentioned recently?",
];

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error || "Request failed.";
  } catch {
    return "Request failed.";
  }
}

function getServerThemeSnapshot(): ThemeMode {
  return "dark";
}

function getBrowserThemeSnapshot(): ThemeMode {
  if (typeof window === "undefined") {
    return getServerThemeSnapshot();
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    return "dark";
  } catch {
    return getServerThemeSnapshot();
  }
}

function subscribeToThemeStore(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

function writeTheme(theme: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures; dispatching still updates this tab.
  }

  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function sortThreadsByUpdatedAt(threads: ChatThread[]) {
  return [...threads].sort((left, right) => {
    return Date.parse(right.updated_at) - Date.parse(left.updated_at);
  });
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "h-11 rounded-full px-5 text-sm font-medium transition",
        active
          ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-sm"
          : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function AutoGrowTextarea({
  className,
  rows,
  value,
  ...props
}: ComponentProps<typeof Textarea>) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`;
  }, [value]);

  return (
    <Textarea
      className={cn("chat-textarea max-h-44 overflow-y-auto", className)}
      ref={textareaRef}
      rows={rows ?? 1}
      value={value}
      {...props}
    />
  );
}

function MemoryCard({
  entry,
  onOpen,
}: {
  entry: Entry;
  onOpen: (entry: Entry) => void;
}) {
  return (
    <button
      className="group flex min-h-44 flex-col justify-between rounded-[1.7rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
      onClick={() => onOpen(entry)}
      type="button"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-[var(--surface-3)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)]">
            {formatEntryDate(entry.created_at)}
          </span>
          <span className="text-xs font-medium text-[var(--muted)] opacity-0 transition group-hover:opacity-100">
            Open
          </span>
        </div>
        <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-[0.95rem] leading-7 text-[var(--text-soft)]">
          {entry.content}
        </p>
      </div>
    </button>
  );
}

function MemoryDetail({
  deleting,
  entry,
  onClose,
  onDelete,
}: {
  deleting: boolean;
  entry: Entry;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    onClose();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <article className="w-full max-w-2xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-strong)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="secondary">Memory</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text)]">
              Saved note
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatEntryDate(entry.created_at)}
            </p>
          </div>
          <button
            className="rounded-full px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-2)] p-5">
          <p className="whitespace-pre-wrap text-base leading-8 text-[var(--text-soft)]">
            {entry.content}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            className="ml-auto rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2 text-sm font-medium text-[var(--danger)] transition hover:opacity-85 disabled:pointer-events-none disabled:opacity-50"
            disabled={deleting}
            onClick={() => onDelete(entry.id)}
            type="button"
          >
            {deleting ? "Deleting..." : "Delete memory"}
          </button>
        </div>
      </article>
    </div>
  );
}

function MemorySkeleton() {
  return (
    <div className="min-h-44 animate-pulse rounded-[1.7rem] border border-[var(--border)] bg-[var(--surface)]/70" />
  );
}

function MemoryEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] px-6 py-14 text-center">
      <p className="text-xl font-semibold tracking-[-0.03em] text-[var(--text)]">
        No memories yet.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
        Add a few short notes first. They become the context Engram uses when
        you chat.
      </p>
      <Button className="mt-6" onClick={onAdd} type="button">
        Add memory
      </Button>
    </div>
  );
}

function CaptureBox({
  captureDraft,
  error,
  isSaving,
  onCaptureDraftChange,
  onClose,
  onSaveEntry,
}: {
  captureDraft: string;
  error: string | null;
  isSaving: boolean;
  onCaptureDraftChange: (value: string) => void;
  onClose: () => void;
  onSaveEntry: () => void;
}) {
  return (
    <form
      className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-2)] p-4 shadow-[var(--shadow-soft)] sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void onSaveEntry();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text)]">
            New memory
          </h2>
        </div>
        <button
          className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <Textarea
        autoFocus
        className="mt-4 min-h-28 resize-none"
        onChange={(event) => onCaptureDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void onSaveEntry();
          }
        }}
        placeholder="Write something you want future you to find..."
        value={captureDraft}
      />

      {error ? (
        <p className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <span>Enter saves. Shift+Enter adds a new line.</span>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save memory"}
        </Button>
      </div>
    </form>
  );
}

function ChatHistoryPane({
  activeThreadId,
  chatsLoading,
  draftTurns,
  onNewChat,
  onSelectThread,
  threads,
}: {
  activeThreadId: string | null;
  chatsLoading: boolean;
  draftTurns: ChatTurn[];
  onNewChat: () => void;
  onSelectThread: (threadId: string | null) => void;
  threads: ChatThread[];
}) {
  return (
    <aside className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 p-3 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-4">
      <div className="flex items-center justify-between gap-3 lg:block">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-strong)]">
            History
          </p>
          <p className="mt-1 hidden text-sm text-[var(--muted)] lg:block">
            Recent conversations
          </p>
        </div>
        <Button className="lg:mt-4 lg:w-full" onClick={onNewChat} type="button">
          New chat
        </Button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:max-h-[calc(100dvh-16rem)] lg:flex-col lg:overflow-y-auto lg:pb-0">
        {!activeThreadId && draftTurns.length > 0 ? (
          <button
            className="min-w-56 rounded-[1.2rem] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-left lg:min-w-0"
            onClick={() => onSelectThread(null)}
            type="button"
          >
            <p className="truncate text-sm font-medium text-[var(--text)]">
              Draft chat
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Unsaved conversation
            </p>
          </button>
        ) : null}

        {chatsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              className="h-20 min-w-56 animate-pulse rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface)]/70 lg:min-w-0"
              key={index}
            />
          ))
        ) : threads.length > 0 ? (
          threads.map((thread) => (
            <button
              className={cn(
                "min-w-56 rounded-[1.2rem] border px-4 py-3 text-left transition lg:min-w-0",
                activeThreadId === thread.id
                  ? "border-[var(--border-strong)] bg-[var(--surface)]"
                  : "border-transparent bg-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]/70",
              )}
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              type="button"
            >
              <p className="truncate text-sm font-medium text-[var(--text)]">
                {thread.title}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {formatEntryDate(thread.updated_at)}
              </p>
            </button>
          ))
        ) : (
          <div className="min-w-56 rounded-[1.2rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm leading-6 text-[var(--muted)] lg:min-w-0">
            No chat history yet.
          </div>
        )}
      </div>
    </aside>
  );
}

function ChatEmpty({
  entriesCount,
  isQuerying,
  onQueryDraftChange,
  onPromptClick,
  onQuerySubmit,
  queryDraft,
  queryError,
}: {
  entriesCount: number;
  isQuerying: boolean;
  onQueryDraftChange: (value: string) => void;
  onPromptClick: (value: string) => void;
  onQuerySubmit: (questionOverride?: string) => void;
  queryDraft: string;
  queryError: string | null;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-2 py-12 text-center">
      <Badge className="mx-auto" variant="secondary">
        {entriesCount} memories connected
      </Badge>
      <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.055em] text-[var(--text)] sm:text-5xl">
        Ask anything you chose to remember.
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-balance text-base leading-7 text-[var(--muted)]">
        Ask a question and Engram will answer from the memories you saved.
      </p>
      <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-medium leading-6 text-[var(--text-soft)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
            key={suggestion}
            onClick={() => onPromptClick(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="mx-auto mt-6 w-full max-w-2xl text-left"
        onSubmit={(event) => {
          event.preventDefault();
          void onQuerySubmit();
        }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-2 pl-5 shadow-[var(--shadow-soft)] transition focus-within:border-[var(--border-strong)]">
          <AutoGrowTextarea
            className="min-h-11 resize-none rounded-none border-0 bg-transparent px-0 py-2.5 text-base leading-6 shadow-none focus:border-0 focus:bg-transparent"
            onChange={(event) => onQueryDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onQuerySubmit();
              }
            }}
            placeholder="Start a new chat..."
            value={queryDraft}
          />
          <Button
            className="h-11 shrink-0 px-5"
            disabled={isQuerying}
            type="submit"
          >
            {isQuerying ? "Thinking..." : "Ask"}
          </Button>
        </div>

        {queryError ? (
          <p className="mt-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
            {queryError}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function ChatMessage({
  active,
  onSelect,
  turn,
}: {
  active: boolean;
  onSelect: (id: string) => void;
  turn: ChatTurn;
}) {
  return (
    <article className="space-y-3">
      <div className="flex justify-end">
        <button
          className={cn(
            "max-w-[82%] rounded-[1.6rem] rounded-br-md bg-[var(--accent)] px-4 py-3 text-left text-[var(--accent-text)] shadow-[var(--shadow-soft)] transition sm:max-w-[72%] sm:px-5 sm:py-4",
            active ? "ring-2 ring-[var(--border-strong)]" : "",
          )}
          onClick={() => onSelect(turn.id)}
          type="button"
        >
          <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[0.95rem]">
            {turn.question}
          </p>
          <p className="mt-2 text-right text-[0.7rem] opacity-70">
            {formatEntryDate(turn.createdAt)}
          </p>
        </button>
      </div>

      <div className="flex justify-start">
        <button
          className={cn(
            "max-w-[88%] rounded-[1.6rem] rounded-bl-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left shadow-[var(--shadow-soft)] transition sm:max-w-[76%] sm:px-5 sm:py-4",
            active ? "border-[var(--border-strong)]" : "",
          )}
          onClick={() => onSelect(turn.id)}
          type="button"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
            <span>Engram</span>
            <span className="h-1 w-1 rounded-full bg-[var(--muted)]" />
            <span>
              {turn.state === "loading"
                ? "Searching"
                : turn.state === "error"
                  ? "Error"
                  : `${turn.sources.length} sources`}
            </span>
          </div>

          {turn.state === "loading" ? (
            <div className="space-y-3 py-2">
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-[var(--surface-3)]" />
              <div className="h-3 w-full animate-pulse rounded-full bg-[var(--surface-3)]" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-[var(--surface-3)]" />
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-soft)] sm:text-[0.95rem]">
              {turn.answer}
            </p>
          )}
        </button>
      </div>
    </article>
  );
}

function ChatComposer({
  isQuerying,
  onQueryDraftChange,
  onQuerySubmit,
  queryDraft,
  queryError,
}: {
  isQuerying: boolean;
  onQueryDraftChange: (value: string) => void;
  onQuerySubmit: (questionOverride?: string) => void;
  queryDraft: string;
  queryError: string | null;
}) {
  return (
    <div className="shrink-0 border-t border-[var(--border)] bg-[var(--shell-bg)] px-3 py-4 backdrop-blur-xl sm:px-6">
      <form
        className="mx-auto max-w-4xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)] transition focus-within:border-[var(--border-strong)]"
        onSubmit={(event) => {
          event.preventDefault();
          void onQuerySubmit();
        }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 pl-3">
          <AutoGrowTextarea
            className="min-h-11 resize-none rounded-none border-0 bg-transparent px-0 py-2.5 text-base leading-6 shadow-none focus:border-0 focus:bg-transparent"
            onChange={(event) => onQueryDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onQuerySubmit();
              }
            }}
            placeholder="Ask about your memories..."
            value={queryDraft}
          />

          <Button
            className="h-11 shrink-0 px-5"
            disabled={isQuerying}
            type="submit"
          >
            {isQuerying ? "Thinking..." : "Ask"}
          </Button>
        </div>

        {queryError ? (
          <p className="mt-2 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
            {queryError}
          </p>
        ) : null}

        <div className="mt-2 flex w-full flex-wrap items-center gap-3 px-1">
          <div className="flex flex-wrap gap-2">
            {PROMPT_SUGGESTIONS.slice(0, 2).map((suggestion) => (
              <button
                className="rounded-full bg-[var(--surface-3)] px-3 py-1.5 text-xs font-medium text-[var(--muted-strong)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
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

          <span className="ml-auto text-xs text-[var(--muted)]">
            Enter sends. Shift+Enter adds a line.
          </span>
        </div>
      </form>
    </div>
  );
}

export function EngramApp({ userEmail }: { userEmail: string | null }) {
  const [activeView, setActiveView] = useState<AppView>("memories");
  const theme = useSyncExternalStore(
    subscribeToThemeStore,
    getBrowserThemeSnapshot,
    getServerThemeSnapshot,
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [captureDraft, setCaptureDraft] = useState("");
  const [queryDraft, setQueryDraft] = useState("");
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draftTurns, setDraftTurns] = useState<ChatTurn[]>([]);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAppState() {
      try {
        const [entriesResponse, chatsResponse] = await Promise.all([
          fetch("/api/entries", {
            cache: "no-store",
          }),
          fetch("/api/chats", {
            cache: "no-store",
          }),
        ]);

        if (!entriesResponse.ok) {
          throw new Error(await readErrorMessage(entriesResponse));
        }

        if (!chatsResponse.ok) {
          throw new Error(await readErrorMessage(chatsResponse));
        }

        const [entriesData, chatsData] = (await Promise.all([
          entriesResponse.json(),
          chatsResponse.json(),
        ])) as [Entry[], ChatThread[]];

        if (!cancelled) {
          startTransition(() => {
            setEntries(entriesData);
            setThreads(chatsData);
            setActiveThreadId(null);
            setActiveTurnId(null);
          });
        }
      } catch (error) {
        console.error("Failed to load app state:", error);

        if (!cancelled) {
          setCaptureError(
            error instanceof Error
              ? error.message
              : "Failed to load saved data.",
          );
        }
      } finally {
        if (!cancelled) {
          setEntriesLoading(false);
          setChatsLoading(false);
        }
      }
    }

    void loadAppState();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;
  const currentTurns = activeThread ? activeThread.turns : draftTurns;
  const activeTurn =
    currentTurns.find((turn) => turn.id === activeTurnId) ??
    currentTurns[currentTurns.length - 1];
  const selectedEntry =
    entries.find((entry) => entry.id === selectedEntryId) ?? null;
  const selectedTurnId = activeTurn?.id ?? null;
  useEffect(() => {
    if (activeView === "chat") {
      threadEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [activeView, currentTurns]);

  function selectThread(threadId: string | null) {
    const nextThread =
      threads.find((thread) => thread.id === threadId) ?? null;

    setActiveThreadId(threadId);
    setActiveTurnId(nextThread?.turns[nextThread.turns.length - 1]?.id ?? null);
    setQueryError(null);
    setActiveView("chat");
  }

  function updateDraftTurn(turnId: string, updater: (turn: ChatTurn) => ChatTurn) {
    setDraftTurns((currentTurns) =>
      currentTurns.map((turn) => (turn.id === turnId ? updater(turn) : turn)),
    );
  }

  function updatePersistedTurn(
    threadId: string,
    turnId: string,
    updater: (turn: ChatTurn) => ChatTurn,
  ) {
    setThreads((currentThreads) =>
      currentThreads.map((thread) => {
        if (thread.id !== threadId) {
          return thread;
        }

        return {
          ...thread,
          turns: thread.turns.map((turn) =>
            turn.id === turnId ? updater(turn) : turn,
          ),
        };
      }),
    );
  }

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
      setActiveView("memories");
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
        setThreads((currentThreads) =>
          currentThreads.map((thread) => ({
            ...thread,
            turns: thread.turns.map((turn) => ({
              ...turn,
              sources: turn.sources.filter((entry) => entry.id !== id),
            })),
          })),
        );
        setDraftTurns((currentTurns) =>
          currentTurns.map((turn) => ({
            ...turn,
            sources: turn.sources.filter((entry) => entry.id !== id),
          })),
        );
        setSelectedEntryId((currentId) => (currentId === id ? null : currentId));
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
      setActiveView("chat");
      return;
    }

    if (isQuerying) {
      return;
    }

    const pendingTurnId = crypto.randomUUID();
    const pendingTurn: ChatTurn = {
      answer: "",
      createdAt: new Date().toISOString(),
      id: pendingTurnId,
      question,
      sources: [],
      state: "loading",
    };
    const submittingThreadId = activeThreadId;

    setActiveView("chat");
    setQueryError(null);
    setIsQuerying(true);
    setQueryDraft("");

    startTransition(() => {
      if (submittingThreadId) {
        setThreads((currentThreads) =>
          sortThreadsByUpdatedAt(
            currentThreads.map((thread) => {
              if (thread.id !== submittingThreadId) {
                return thread;
              }

              return {
                ...thread,
                turns: [...thread.turns, pendingTurn],
                updated_at: pendingTurn.createdAt,
              };
            }),
          ),
        );
      } else {
        setDraftTurns((currentTurns) => [...currentTurns, pendingTurn]);
      }

      setActiveTurnId(pendingTurnId);
    });

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          threadId: submittingThreadId,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = (await response.json()) as QueryResponse;

      startTransition(() => {
        if (submittingThreadId) {
          setThreads((currentThreads) =>
            sortThreadsByUpdatedAt(
              currentThreads.map((thread) => {
                if (thread.id !== data.thread.id) {
                  return thread;
                }

                return {
                  ...thread,
                  ...data.thread,
                  turns: thread.turns.map((turn) =>
                    turn.id === pendingTurnId ? data.turn : turn,
                  ),
                };
              }),
            ),
          );
        } else {
          setDraftTurns([]);
          setThreads((currentThreads) =>
            sortThreadsByUpdatedAt([
              {
                ...data.thread,
                turns: [data.turn],
              },
              ...currentThreads.filter((thread) => thread.id !== data.thread.id),
            ]),
          );
          setActiveThreadId(data.thread.id);
        }

        setActiveTurnId(data.turn.id);
      });

      if (data.turn.state === "error") {
        setQueryError(data.turn.answer);
      }
    } catch (error) {
      console.error("Failed to query entries:", error);

      const message =
        error instanceof Error ? error.message : "Failed to query entries.";

      setQueryError(message);

      startTransition(() => {
        if (submittingThreadId) {
          updatePersistedTurn(submittingThreadId, pendingTurnId, (turn) => ({
            ...turn,
            answer: message,
            state: "error",
          }));
        } else {
          updateDraftTurn(pendingTurnId, (turn) => ({
            ...turn,
            answer: message,
            state: "error",
          }));
        }
      });
    } finally {
      setIsQuerying(false);
    }
  }

  function handleResetConversation() {
    setDraftTurns([]);
    setActiveThreadId(null);
    setActiveTurnId(null);
    setQueryDraft("");
    setQueryError(null);
    setActiveView("chat");
  }

  function handleOpenChatTab() {
    setDraftTurns([]);
    setActiveThreadId(null);
    setActiveTurnId(null);
    setQueryDraft("");
    setQueryError(null);
    setActiveView("chat");
  }

  return (
    <div
      className="engram-theme relative h-[100dvh] w-full overflow-hidden px-3 py-4 sm:px-6 lg:px-8"
      data-theme={theme}
      suppressHydrationWarning
    >
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2.4rem] border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-[var(--shadow-strong)] backdrop-blur-2xl">
        <header className="shrink-0 border-b border-[var(--border)] px-4 py-4 sm:px-7">
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <Link
              className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted-strong)] transition hover:text-[var(--text)]"
              href="/"
            >
              Engram
            </Link>

            <div className="justify-self-center rounded-full border border-[var(--border)] bg-[var(--surface)]/75 p-1 shadow-sm">
              <TabButton
                active={activeView === "memories"}
                onClick={() => setActiveView("memories")}
              >
                Memories
              </TabButton>
              <TabButton
                active={activeView === "chat"}
                onClick={handleOpenChatTab}
              >
                Chat
              </TabButton>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-self-start sm:justify-self-end">
              <span
                className="max-w-44 truncate rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-2 text-xs font-medium text-[var(--muted)]"
                title={userEmail ?? "Signed in"}
              >
                {userEmail ?? "Signed in"}
              </span>
              <form action={logout}>
                <button
                  className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-3 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
              <button
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                aria-pressed={theme === "light"}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-[var(--text)] transition hover:bg-[var(--surface-hover)]"
                onClick={() => writeTheme(theme === "dark" ? "light" : "dark")}
                type="button"
              >
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full transition",
                    theme === "dark"
                      ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-sm"
                      : "text-[var(--muted)]",
                  )}
                >
                  <svg
                    aria-hidden="true"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 7 7 0 1 0 20.5 14.5Z" />
                  </svg>
                </span>
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full transition",
                    theme === "light"
                      ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-sm"
                      : "text-[var(--muted)]",
                  )}
                >
                  <svg
                    aria-hidden="true"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2.5M12 19.5V22M4.93 4.93 6.7 6.7M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07 6.7 17.3M17.3 6.7l1.77-1.77" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </header>

        {activeView === "memories" ? (
          <section className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                  Memories
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Click a card to open the full note.
                </p>
              </div>
              <Badge variant="outline">{entries.length} saved</Badge>
            </div>

            {isCaptureOpen ? (
              <div className="mt-5">
                <CaptureBox
                  captureDraft={captureDraft}
                  error={captureError}
                  isSaving={isSaving}
                  onCaptureDraftChange={setCaptureDraft}
                  onClose={() => setIsCaptureOpen(false)}
                  onSaveEntry={handleSaveEntry}
                />
              </div>
            ) : captureError ? (
              <p className="mt-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
                {captureError}
              </p>
            ) : null}

            <div className="mt-6 flex-1">
              {entriesLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <MemorySkeleton key={index} />
                  ))}
                </div>
              ) : entries.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry) => (
                    <MemoryCard
                      entry={entry}
                      key={entry.id}
                      onOpen={(entry) => setSelectedEntryId(entry.id)}
                    />
                  ))}
                </div>
              ) : (
                <MemoryEmptyState onAdd={() => setIsCaptureOpen(true)} />
              )}
            </div>

            <button
              aria-label="Add memory"
              className="sticky bottom-5 ml-auto mt-6 flex h-16 items-center gap-3 rounded-full bg-[var(--accent)] px-6 text-base font-semibold text-[var(--accent-text)] shadow-[0_22px_60px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-hover)]"
              onClick={() => setIsCaptureOpen(true)}
              type="button"
            >
              <span className="text-3xl font-light leading-none">+</span>
              <span>Add memory</span>
            </button>

            {selectedEntry ? (
              <MemoryDetail
                deleting={deletingId === selectedEntry.id}
                entry={selectedEntry}
                onClose={() => setSelectedEntryId(null)}
                onDelete={handleDeleteEntry}
              />
            ) : null}
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <ChatHistoryPane
                activeThreadId={activeThreadId}
                chatsLoading={chatsLoading}
                draftTurns={draftTurns}
                onNewChat={handleResetConversation}
                onSelectThread={selectThread}
                threads={threads}
              />

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7">
                  {currentTurns.length === 0 ? (
                    <ChatEmpty
                      entriesCount={entries.length}
                      isQuerying={isQuerying}
                      onQueryDraftChange={setQueryDraft}
                      onPromptClick={(value) => void handleSubmitQuery(value)}
                      onQuerySubmit={handleSubmitQuery}
                      queryDraft={queryDraft}
                      queryError={queryError}
                    />
                  ) : (
                    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7">
                      {currentTurns.map((turn) => (
                        <ChatMessage
                          active={selectedTurnId === turn.id}
                          key={turn.id}
                          onSelect={setActiveTurnId}
                          turn={turn}
                        />
                      ))}
                      <div ref={threadEndRef} />
                    </div>
                  )}
                </div>

                {currentTurns.length > 0 ? (
                  <ChatComposer
                    isQuerying={isQuerying}
                    onQueryDraftChange={setQueryDraft}
                    onQuerySubmit={handleSubmitQuery}
                    queryDraft={queryDraft}
                    queryError={queryError}
                  />
                ) : null}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
