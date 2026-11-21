// Copyright (c) 2026 Philipp Orlov

/** Where one file is: waiting its turn, sending, the server is working on it, or the answer has come back. */
export type UploadState = 'waiting' | 'uploading' | 'processing' | 'done';

/** How the outcome of one file reads: success, a warning (sent, but not added as such), or an error. */
export type OutcomeLevel = 'success' | 'warning' | 'error' | 'info';

export interface Outcome {
  level: OutcomeLevel;
  message: string;
}

/** The answer of the server: any HTTP status, with the body parsed as JSON when it is JSON, else as text. */
export interface UploadResponse {
  status: number;
  body: unknown;
}

export interface SendHooks {
  /** Bytes sent so far, as a fraction from 0 to 1. */
  onProgress(fraction: number): void;
  /** All bytes are sent; the server is now working on the file. */
  onSent(): void;
}

/** Sends one file. `abort` stops it; `done` settles with the answer, or rejects when the connection failed. */
export interface Transfer {
  done: Promise<UploadResponse>;
  abort(): void;
}

export type Sender = (file: File, hooks: SendHooks) => Transfer;

/** Turns the answer (or the failure to get one) into what the person is told about the file. */
export type Describe = (result: UploadResponse | Error) => Outcome;

export interface UploadItem {
  /** Stable for the life of the queue; use it as a track key. */
  readonly id: number;
  readonly file: File;
  readonly state: UploadState;
  /** 0 to 1 while uploading; 1 once every byte is sent. */
  readonly progress: number;
  /** Set once the file is done. */
  readonly outcome: Outcome | null;
}

export interface UploadQueueOptions {
  send: Sender;
  describe: Describe;
  /** Files sent at the same time. */
  concurrency?: number;
}

/**
 * Sends files a few at a time and reports each one's progress and outcome. Framework-free: an Angular, React or other
 * layer subscribes and draws. Every change replaces the item it touches, so a subscriber can compare references.
 */
export class UploadQueue {
  private items_: UploadItem[] = [];
  private listeners = new Set<(items: readonly UploadItem[]) => void>();
  private transfers = new Map<number, Transfer>();
  private nextId = 1;
  private disposed = false;
  private readonly concurrency: number;

  constructor(private readonly options: UploadQueueOptions) {
    this.concurrency = Math.max(1, options.concurrency ?? 2);
  }

  /** The current items, in the order they were added. */
  get items(): readonly UploadItem[] {
    return this.items_;
  }

  /** True while any file is waiting, being sent or being worked on. */
  get busy(): boolean {
    return this.items_.some(i => i.state !== 'done');
  }

  /** Calls `listener` now and after every change. Returns the function that stops it. */
  subscribe(listener: (items: readonly UploadItem[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.items_);
    return () => this.listeners.delete(listener);
  }

  /** Adds files to the end of the queue and starts sending them as slots free up. */
  add(files: readonly File[]): void {
    if (this.disposed || files.length === 0) return;
    const added: UploadItem[] = files.map(file => ({
      id: this.nextId++,
      file,
      state: 'waiting',
      progress: 0,
      outcome: null,
    }));
    this.replace([...this.items_, ...added]);
    this.pump();
  }

  /** Forgets the files that are done, so the list shows only what is still going on. */
  clearFinished(): void {
    this.replace(this.items_.filter(i => i.state !== 'done'));
  }

  /** Stops every transfer and drops the queue. Nothing more is sent, and no more notifications are made. */
  dispose(): void {
    this.disposed = true;
    for (const transfer of this.transfers.values()) transfer.abort();
    this.transfers.clear();
    this.listeners.clear();
    this.items_ = [];
  }

  private pump(): void {
    while (!this.disposed && this.transfers.size < this.concurrency) {
      const next = this.items_.find(i => i.state === 'waiting');
      if (!next) return;
      this.start(next);
    }
  }

  private start(item: UploadItem): void {
    const id = item.id;
    this.update(id, { state: 'uploading', progress: 0 });
    // Registered before the send starts, so a progress call made during it is not lost.
    this.transfers.set(id, { done: new Promise<UploadResponse>(() => undefined), abort: () => undefined });
    const transfer = this.options.send(item.file, {
      onProgress: fraction => {
        if (this.transfers.has(id)) this.update(id, { progress: Math.min(1, Math.max(0, fraction)) });
      },
      onSent: () => {
        if (this.transfers.has(id)) this.update(id, { state: 'processing', progress: 1 });
      },
    });
    this.transfers.set(id, transfer);
    if (this.disposed) {
      transfer.abort();
      return;
    }

    transfer.done.then(
      response => this.finish(id, this.options.describe(response)),
      error => this.finish(id, this.options.describe(error instanceof Error ? error : new Error(String(error)))),
    );
  }

  private finish(id: number, outcome: Outcome): void {
    if (!this.transfers.has(id)) return;
    this.transfers.delete(id);
    this.update(id, { state: 'done', progress: 1, outcome });
    this.pump();
  }

  private update(id: number, change: Partial<Pick<UploadItem, 'state' | 'progress' | 'outcome'>>): void {
    if (this.disposed) return;
    this.replace(this.items_.map(i => (i.id === id ? { ...i, ...change } : i)));
  }

  private replace(items: UploadItem[]): void {
    this.items_ = items;
    for (const listener of this.listeners) listener(items);
  }
}
