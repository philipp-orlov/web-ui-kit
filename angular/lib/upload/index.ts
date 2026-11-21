// Copyright (c) 2026 Philipp Orlov

export { UploadComponent } from './upload.component';
// The types a user of the component needs to describe the server's answers; the logic is in @web-ui-kit/core/upload.
export type { Describe, Outcome, OutcomeLevel, UploadItem, UploadResponse, UploadState } from '@web-ui-kit/core/upload';
export { describeResponse } from '@web-ui-kit/core/upload';
