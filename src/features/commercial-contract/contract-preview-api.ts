import type { ContractRevision } from './contract-api';
export type ContractPreview = Readonly<{
  bookingRevision: number;
  document: ContractRevision['document'];
}>;
