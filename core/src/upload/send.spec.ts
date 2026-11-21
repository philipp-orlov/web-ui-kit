// @vitest-environment jsdom
import { TransferError, xhrSender } from './send';

/** Stands in for XMLHttpRequest: the test drives the events itself. */
class FakeXhr {
  static last: FakeXhr;
  status = 0;
  responseText = '';
  method = '';
  url = '';
  sent: unknown = null;
  requestHeaders: Record<string, string> = {};
  upload: { onprogress: ((e: ProgressEvent) => void) | null; onload: (() => void) | null } = { onprogress: null, onload: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  aborted = false;

  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.requestHeaders[name] = value;
  }
  send(body: unknown) {
    this.sent = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

describe('xhrSender', () => {
  beforeEach(() => vi.stubGlobal('XMLHttpRequest', FakeXhr));
  afterEach(() => vi.unstubAllGlobals());

  it('posts the file as the raw body, with the headers for that file', () => {
    const file = new File(['%PDF-1.4'], 'scan 1.pdf');
    xhrSender({ url: () => '/upload', headers: f => ({ 'X-File-Name': encodeURIComponent(f.name), Authorization: 'Bearer t' }) })(file, {
      onProgress: () => undefined,
      onSent: () => undefined,
    });
    const xhr = FakeXhr.last;
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/upload');
    expect(xhr.requestHeaders).toEqual({ 'Content-Type': 'application/octet-stream', 'X-File-Name': 'scan%201.pdf', Authorization: 'Bearer t' });
    expect(xhr.sent).toBe(file);
  });

  it('reports the bytes sent as they go, and processing once the last byte has left', () => {
    const progress: number[] = [];
    let sent = 0;
    xhrSender({ url: () => '/upload' })(new File(['x'], 'a.jpg'), {
      onProgress: f => progress.push(f),
      onSent: () => sent++,
    });
    const xhr = FakeXhr.last;
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 } as ProgressEvent);
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 50, total: 0 } as ProgressEvent);
    xhr.upload.onload?.();
    expect(progress).toEqual([0.25]);
    expect(sent).toBe(1);
  });

  it('resolves with the status and the parsed JSON body', async () => {
    const transfer = xhrSender({ url: () => '/upload' })(new File(['x'], 'a.jpg'), { onProgress: () => undefined, onSent: () => undefined });
    FakeXhr.last.status = 200;
    FakeXhr.last.responseText = '{"outcome":"added"}';
    FakeXhr.last.onload?.();
    await expect(transfer.done).resolves.toEqual({ status: 200, body: { outcome: 'added' } });
  });

  it('keeps a body that is not JSON as text, and an empty one as null', async () => {
    const a = xhrSender({ url: () => '/upload' })(new File(['x'], 'a.jpg'), { onProgress: () => undefined, onSent: () => undefined });
    FakeXhr.last.status = 500;
    FakeXhr.last.responseText = '<html>';
    FakeXhr.last.onload?.();
    await expect(a.done).resolves.toEqual({ status: 500, body: '<html>' });

    const b = xhrSender({ url: () => '/upload' })(new File(['x'], 'b.jpg'), { onProgress: () => undefined, onSent: () => undefined });
    FakeXhr.last.status = 204;
    FakeXhr.last.responseText = '';
    FakeXhr.last.onload?.();
    await expect(b.done).resolves.toEqual({ status: 204, body: null });
  });

  it('rejects with a TransferError when the connection fails, and when it is aborted', async () => {
    const failed = xhrSender({ url: () => '/upload' })(new File(['x'], 'a.jpg'), { onProgress: () => undefined, onSent: () => undefined });
    FakeXhr.last.onerror?.();
    await expect(failed.done).rejects.toBeInstanceOf(TransferError);

    const stopped = xhrSender({ url: () => '/upload' })(new File(['x'], 'b.jpg'), { onProgress: () => undefined, onSent: () => undefined });
    stopped.abort();
    expect(FakeXhr.last.aborted).toBe(true);
    await expect(stopped.done).rejects.toThrow('The upload was stopped.');
  });
});
