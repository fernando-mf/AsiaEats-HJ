import { useSyncExternalStore } from 'react';

// The output console lives outside React so entries recorded on /login and /register
// survive the navigation to /dashboard. It is in memory only: a refresh clears it.
const MAX_ENTRIES = 200;

export type ConsoleActor = {
  username: string;
  role: string;
};

export type ConsoleEntry = {
  id: number;
  time: Date;
  command: string;
  status: 'success' | 'error';
  // read is true for GET requests. Reads are always recorded but hidden by default.
  read: boolean;
  code?: string;
  message: string;
  actor?: ConsoleActor;
};

let entries: readonly ConsoleEntry[] = [];
let currentActor: ConsoleActor | undefined;
let nextId = 0;
const listeners = new Set<() => void>();

function append(entry: Pick<ConsoleEntry, 'command' | 'status' | 'read' | 'code' | 'message'>): void {
  nextId += 1;
  entries = [{ ...entry, id: nextId, time: new Date(), actor: currentActor }, ...entries].slice(0, MAX_ENTRIES);
  listeners.forEach(listener => listener());
}

export function logSuccess(command: string, message: string, read = false): void {
  append({ command, status: 'success', read, message });
}

// logError records a failed command. Errors caught in the browser before any request
// is sent (form checks, missing input) use the default `client_validation` code.
export function logError(command: string, message: string, code = 'client_validation', read = false): void {
  append({ command, status: 'error', read, code, message });
}

export function clearConsole(): void {
  entries = [];
  listeners.forEach(listener => listener());
}

// setConsoleActor sets who is signed in. New entries snapshot it; existing entries keep theirs.
export function setConsoleActor(actor: ConsoleActor | undefined): void {
  currentActor = actor ? { username: actor.username, role: actor.role } : undefined;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): readonly ConsoleEntry[] {
  return entries;
}

export function useConsoleEntries(): readonly ConsoleEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export type ConsoleRow = {
  entry: ConsoleEntry; // the newest entry of the group
  count: number;
};

function isSuccessfulRead(entry: ConsoleEntry): boolean {
  return entry.read && entry.status === 'success';
}

function sameRead(a: ConsoleEntry, b: ConsoleEntry): boolean {
  return (
    isSuccessfulRead(a) &&
    isSuccessfulRead(b) &&
    a.command === b.command &&
    a.actor?.username === b.actor?.username &&
    a.actor?.role === b.actor?.role
  );
}

// visibleConsoleRows is display-only: it never changes the recorded entries.
// Writes and every error are always shown; successful reads only when showReads is on,
// with consecutive identical reads collapsed into one row and a count.
export function visibleConsoleRows(all: readonly ConsoleEntry[], showReads: boolean): ConsoleRow[] {
  const rows: ConsoleRow[] = [];

  for (const entry of all) {
    if (isSuccessfulRead(entry) && !showReads) continue;

    const previous = rows.at(-1);
    if (previous && sameRead(previous.entry, entry)) {
      previous.count += 1;
      continue;
    }

    rows.push({ entry, count: 1 });
  }

  return rows;
}
