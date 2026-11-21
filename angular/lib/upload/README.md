# upload

Chooses files, checks them, and sends them to a server one request per file, with a progress bar for each. No
application dependencies: copy this folder into another project (and `core/src/upload` of web-ui-kit core) and import
`UploadComponent` from `@web-ui-kit/angular/upload`.

```html
<ui-upload
  url="upload"
  [extensions]="['.jpg', '.jpeg', '.pdf']"
  [maxFiles]="100"
  [headers]="authHeaders"
  [describe]="describeAnswer"
  (busyChange)="busy = $event"
  (finished)="onFinished($event)">
  <p>Choose the pictures or PDF files to add.</p>
</ui-upload>
```

```ts
authHeaders = (file: File) => ({ Authorization: `Bearer ${this.token}`, 'X-File-Name': encodeURIComponent(file.name) });

describeAnswer = (result: UploadResponse | Error): Outcome => {
  if (result instanceof Error) return { level: 'error', message: result.message };
  const body = result.body as { outcome?: string; message?: string };
  if (body.outcome === 'duplicate') return { level: 'warning', message: body.message ?? 'Already here.' };
  return result.status < 300 ? { level: 'success', message: body.message ?? 'Added.' } : { level: 'error', message: body.message ?? 'Refused.' };
};
```

## What the person sees

- The chosen files are checked first: a file of the wrong kind, an empty file, or one over `maxFileBytes` is named and
  left out; a choice with more than `maxFiles` files is refused as a whole, so nothing is sent by surprise.
- Each file has its own bar while its bytes go to the server (the browser's own count, so it moves while the file travels).
  Then "The server is checking the file…" until the answer comes, and the answer in words.
- Two files travel at the same time; the rest wait. A file whose connection fails says so and the others go on.

## Making it yours

`describe` turns each answer into a level (`success`, `warning`, `error`, `info`) and a sentence. The default reads a 2xx
answer as a success and the body's `message` or `error`. An application whose server says more, such as "already here",
uses its own `describe` and reports that as a `warning`.

The framework-free parts are in `@web-ui-kit/core/upload`: `checkSelection`, `UploadQueue` (concurrency, progress, the
state of every file) and `xhrSender` (the browser transfer). Use them directly from React or any other layer.
