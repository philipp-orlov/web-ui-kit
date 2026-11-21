import { UploadQueue, type SendHooks, type Transfer, type UploadResponse } from './queue';
import { checkSelection, extensionsAccept, formatBytes } from './selection';
import { describeResponse } from './outcome';

/** A sender whose transfers the test finishes by hand. */
interface ManualTransfer {
  file: File;
  hooks: SendHooks;
  resolve(response: UploadResponse): void;
  reject(error: Error): void;
  aborted: boolean;
}

function manualSender() {
  const started: ManualTransfer[] = [];
  const send = (file: File, hooks: SendHooks): Transfer => {
    let resolve!: (response: UploadResponse) => void;
    let reject!: (error: Error) => void;
    const done = new Promise<UploadResponse>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const entry: ManualTransfer = { file, hooks, resolve, reject, aborted: false };
    started.push(entry);
    return { done, abort: () => (entry.aborted = true) };
  };
  return { send, started };
}

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);
const flush = () => new Promise(r => setTimeout(r, 0));

describe('UploadQueue', () => {
  it('sends at most `concurrency` files at once, and starts the next one as a slot frees', async () => {
    const { send, started } = manualSender();
    const queue = new UploadQueue({ send, describe: describeResponse, concurrency: 2 });
    queue.add([file('a.jpg'), file('b.jpg'), file('c.jpg')]);
    expect(started.map(s => s.file.name)).toEqual(['a.jpg', 'b.jpg']);
    expect(queue.items.map(i => i.state)).toEqual(['uploading', 'uploading', 'waiting']);

    started[0].resolve({ status: 200, body: { message: 'Added.' } });
    await flush();
    expect(started.map(s => s.file.name)).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
    expect(queue.items[0].state).toBe('done');
    expect(queue.items[0].outcome).toEqual({ level: 'success', message: 'Added.' });
    expect(queue.busy).toBe(true);
  });

  it('reports progress while sending, then processing once every byte is sent', () => {
    const { send, started } = manualSender();
    const queue = new UploadQueue({ send, describe: describeResponse });
    queue.add([file('a.jpg')]);
    started[0].hooks.onProgress(0.5);
    expect(queue.items[0].progress).toBe(0.5);
    expect(queue.items[0].state).toBe('uploading');
    started[0].hooks.onSent();
    expect(queue.items[0].state).toBe('processing');
    expect(queue.items[0].progress).toBe(1);
  });

  it('keeps the outcome of a failed connection as an error and goes on with the rest', async () => {
    const { send, started } = manualSender();
    const queue = new UploadQueue({ send, describe: describeResponse, concurrency: 1 });
    queue.add([file('a.jpg'), file('b.jpg')]);
    started[0].reject(new Error('lost'));
    await flush();
    expect(queue.items[0].outcome?.level).toBe('error');
    expect(queue.items[1].state).toBe('uploading');
  });

  it('tells subscribers of every change, and stops telling after unsubscribing', () => {
    const { send, started } = manualSender();
    const queue = new UploadQueue({ send, describe: describeResponse });
    const seen: string[] = [];
    const stop = queue.subscribe(items => seen.push(items.map(i => i.state).join(',')));
    queue.add([file('a.jpg')]);
    started[0].hooks.onSent();
    stop();
    queue.add([file('b.jpg')]);
    expect(seen).toEqual(['', 'waiting', 'uploading', 'processing']);
  });

  it('clears only the finished files and aborts everything on dispose', async () => {
    const { send, started } = manualSender();
    const queue = new UploadQueue({ send, describe: describeResponse, concurrency: 2 });
    queue.add([file('a.jpg'), file('b.jpg')]);
    started[0].resolve({ status: 200, body: null });
    await flush();
    queue.clearFinished();
    expect(queue.items.map(i => i.file.name)).toEqual(['b.jpg']);
    queue.dispose();
    expect(started[1].aborted).toBe(true);
    expect(queue.items).toEqual([]);
  });

  it('replaces an item on change rather than editing it, so subscribers can compare references', () => {
    const { send, started } = manualSender();
    const queue = new UploadQueue({ send, describe: describeResponse });
    queue.add([file('a.jpg')]);
    const before = queue.items[0];
    started[0].hooks.onProgress(0.3);
    expect(queue.items[0]).not.toBe(before);
    expect(before.progress).toBe(0);
  });
});

describe('checkSelection', () => {
  const rules = { maxFiles: 3, maxBytes: 1024, accepts: extensionsAccept(['.jpg', '.jpeg', '.pdf']) };

  it('refuses a selection larger than the limit as a whole', () => {
    const result = checkSelection([file('a.jpg'), file('b.jpg'), file('c.jpg'), file('d.jpg')], rules);
    expect(result.tooMany).toBe(4);
    expect(result.accepted).toEqual([]);
    expect(result.rejected).toEqual([]);
  });

  it('sorts the rest into accepted and rejected, with a reason for each rejected file', () => {
    const big = file('huge.pdf', 2048);
    const result = checkSelection([file('a.JPG'), file('notes.txt'), file('empty.pdf', 0), big], { ...rules, maxFiles: 10 });
    expect(result.accepted.map(f => f.name)).toEqual(['a.JPG']);
    expect(result.rejected.map(r => r.file.name)).toEqual(['notes.txt', 'empty.pdf', 'huge.pdf']);
    expect(result.rejected[2].reason).toContain('larger than 1 KB');
  });

  it('matches extensions without case and without accepting a name that merely ends with one', () => {
    const accepts = extensionsAccept(['.pdf']);
    expect(accepts('Scan.PDF')).toBe(true);
    expect(accepts('pdf')).toBe(false);
    expect(accepts('report.pdf.exe')).toBe(false);
  });

  it('formats sizes for people', () => {
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(512 * 1024)).toBe('512 KB');
    expect(formatBytes(3.4 * 1024 * 1024)).toBe('3.4 MB');
    expect(formatBytes(200 * 1024 * 1024)).toBe('200 MB');
  });
});

describe('describeResponse', () => {
  it('reads a 2xx answer as success with the server message, and other answers as errors', () => {
    expect(describeResponse({ status: 200, body: { message: 'Added 3 pictures.' } })).toEqual({ level: 'success', message: 'Added 3 pictures.' });
    expect(describeResponse({ status: 401, body: { error: 'the token is not valid' } })).toEqual({ level: 'error', message: 'the token is not valid' });
    expect(describeResponse({ status: 500, body: '<html>' })).toEqual({ level: 'error', message: 'The server refused the file (HTTP 500).' });
  });
});
