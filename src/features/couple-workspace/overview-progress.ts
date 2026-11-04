import { journeyIndex } from '../../design-system/journey-stepper';
import type { Proposal } from './workspace-helpers';

/** Current server snapshots, rather than list-summary approval flags, drive the journey. */
export function currentJourneyIndex(proposal: Proposal): number {
  if (proposal.phase !== 'DRAFT' && proposal.phase !== 'AWAITING_DEPOSIT')
    return journeyIndex(proposal.phase, proposal.eventDate);
  const timeline = proposal.timeline ?? proposal.effectiveTimeline;
  if (!timeline?.managerApprovedAt || !timeline.coupleApprovedAt) return 1;
  const progress = proposal.commercialProgress;
  if (!progress) return proposal.phase === 'AWAITING_DEPOSIT' ? 2 : 1;
  return progress.modelVersion === 'LEGACY_PROPOSAL_V1' ||
    (progress.contractState === 'APPROVED' && progress.timelineMatchesContract)
    ? 2
    : 1;
}
