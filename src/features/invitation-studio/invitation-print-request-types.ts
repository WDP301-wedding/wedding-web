import type { operations } from '../../lib/api/generated/schema';

export type PrintRequestInputLine =
  operations['previewPrintRequest']['requestBody']['content']['application/json']['lines'][number];
export type PrintRequestQuote =
  operations['previewPrintRequest']['responses'][200]['content']['application/json']['data'];
export type PrintRequestDocument = PrintRequestQuote['document'];
export type PrintRequestView =
  operations['listPrintRequests']['responses'][200]['content']['application/json']['data']['items'][number];
