// Copyright (c) 2026 Philipp Orlov

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  Describe,
  SelectionRules,
  UploadItem,
  UploadQueue,
  checkSelection,
  describeResponse,
  extensionsAccept,
  formatBytes,
  xhrSender,
} from '@web-ui-kit/core/upload';

const MEGABYTE = 1024 * 1024;

/**
 * Chooses files (by a button or by dragging them in), checks them, and posts them to `url` a few at a time, one request
 * per file. Every file shows its own progress bar while it travels, then the server's answer in words.
 *
 * Put the explanation for the person in the element's content: it is shown above the button.
 */
@Component({
  selector: 'ui-upload',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss',
})
export class UploadComponent {
  /** Where each file is posted. Read for every file, so it may change while the component lives. */
  readonly url = input.required<string>();
  /** File-name extensions taken, such as ['.jpg', '.jpeg', '.pdf']. Other files are refused before any is sent. */
  readonly extensions = input<string[]>([]);
  /** The most files chosen at once. A larger choice is refused as a whole. */
  readonly maxFiles = input(100);
  /** The largest file taken, in bytes. */
  readonly maxFileBytes = input(200 * MEGABYTE);
  /** Headers for one file, e.g. the sign-in token and the file name. */
  readonly headers = input<((file: File) => Record<string, string>) | undefined>(undefined);
  /** Reads the server's answer for one file. The default knows a plain 2xx answer and an error body; see describeResponse. */
  readonly describe = input<Describe>(describeResponse);
  readonly chooseLabel = input('Choose files');
  /** True while any file is still being sent or worked on, false when all are done. */
  readonly busyChange = output<boolean>();
  /** The files of a batch that are all done; emitted when the last one finishes. */
  readonly finished = output<readonly UploadItem[]>();

  protected readonly items = signal<readonly UploadItem[]>([]);
  /** Why some chosen files were not sent, one sentence each. */
  protected readonly problems = signal<string[]>([]);
  protected readonly dragging = signal(false);
  protected readonly busy = computed(() => this.items().some(i => i.state !== 'done'));
  protected readonly doneCount = computed(() => this.items().filter(i => i.state === 'done').length);
  protected readonly accept = computed(() => this.extensions().join(','));

  private readonly queue: UploadQueue;
  private wasBusy = false;

  constructor() {
    this.queue = new UploadQueue({
      send: xhrSender({
        url: () => this.url(),
        headers: file => this.headers()?.(file) ?? {},
      }),
      describe: result => this.describe()(result),
      concurrency: 2,
    });
    const stop = this.queue.subscribe(items => {
      this.items.set(items);
      const busy = items.some(i => i.state !== 'done');
      if (busy !== this.wasBusy) {
        this.wasBusy = busy;
        this.busyChange.emit(busy);
        if (!busy && items.length > 0) this.finished.emit(items);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      stop();
      this.queue.dispose();
    });
  }

  protected pick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; // so that choosing the same file again still fires a change
    this.take(files);
  }

  protected over(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.take(Array.from(event.dataTransfer?.files ?? []));
  }

  protected clearFinished(): void {
    this.queue.clearFinished();
  }

  protected percent(item: UploadItem): number {
    return Math.round(item.progress * 100);
  }

  protected size(bytes: number): string {
    return formatBytes(bytes);
  }

  /** The Material icon that goes with a file's outcome. */
  protected iconFor(item: UploadItem): string {
    switch (item.outcome?.level) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }

  private take(files: File[]): void {
    const extensions = this.extensions();
    const rules: SelectionRules = {
      maxFiles: this.maxFiles(),
      maxBytes: this.maxFileBytes(),
      accepts: extensions.length > 0 ? extensionsAccept(extensions) : () => true,
    };
    const selection = checkSelection(files, rules);
    const problems: string[] = [];
    if (selection.tooMany > 0) {
      problems.push(`You chose ${selection.tooMany} files. Please choose ${rules.maxFiles} or fewer at a time; nothing was sent.`);
    }
    for (const rejected of selection.rejected) problems.push(`${rejected.file.name}: ${rejected.reason}`);
    this.problems.set(problems);
    if (selection.accepted.length > 0) this.queue.add(selection.accepted);
  }
}
