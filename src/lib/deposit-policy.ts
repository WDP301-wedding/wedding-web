import { z } from 'zod';

/** Legacy documents omit the percentage; new documents carry the frozen rate. */
export function contractDepositRate(document: unknown): number {
  return (
    z.object({ depositRate: z.int().min(10).max(100).optional() }).parse(document).depositRate ?? 30
  );
}
export function proposalDepositPercentage(proposal: unknown): number {
  return (
    z.object({ depositPercentage: z.int().min(10).max(100).optional() }).parse(proposal)
      .depositPercentage ?? 30
  );
}
