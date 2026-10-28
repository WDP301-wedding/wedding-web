'use client';

import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { InlineError } from '../../design-system/inline-error';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { type WebSessionSnapshot } from '../identity-access/session';
import { browserSession } from '../identity-access/browser-session';
import { CoupleWorkspaceContext } from '../couple-workspace/use-couple-workspace';
import { createCollaborationGateway } from './collaboration-api';
import { CollaborationWorkspace } from './collaboration-workspace';

export { CollaborationWorkspace } from './collaboration-workspace';
export type { CollaborationWorkspaceProps } from './collaboration-workspace';
export {
  listCoupleBookings,
  phaseLabels,
  type Authorize,
  type BookingChoice,
  type ListBookings,
} from './collaboration-utils';

const session = browserSession;
const gateway = createCollaborationGateway();

export function CollaborationPage({
  onBookingChange,
}: {
  onBookingChange?: ((bookingId: string) => void) | undefined;
} = {}) {
  const workspace = useContext(CoupleWorkspaceContext);
  const cachedProposal = workspace?.state.status === 'ready' ? workspace.state.proposal : undefined;
  const [snapshot, setSnapshot] = useState<WebSessionSnapshot | null>(() => {
    const current = session.snapshot();
    return current.status === 'authenticated' ? current : null;
  });
  const [restoreError, setRestoreError] = useState<FriendlyError | null>(null);
  const [restoreKey, setRestoreKey] = useState(0);

  useEffect(() => {
    let active = true;
    void session
      .restore()
      .then((value) => {
        if (active) {
          setSnapshot(value);
          setRestoreError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setRestoreError(describeApiError(caught));
      });
    return () => {
      active = false;
    };
  }, [restoreKey]);

  if (restoreError)
    return (
      <InlineError
        error={restoreError}
        onRetry={() => {
          setRestoreError(null);
          setRestoreKey((value) => value + 1);
        }}
      />
    );

  if (snapshot === null) return <AccessState title="Đang mở không gian cộng tác…" />;

  if (snapshot.status === 'anonymous')
    return (
      <AccessState title="Cần đăng nhập">
        <p role="alert">Hãy đăng nhập hoặc chấp nhận lời mời trước khi xem đề xuất.</p>
        <Link href="/dang-nhap">Về trang đăng nhập</Link>
      </AccessState>
    );

  return (
    <CollaborationWorkspace
      access={snapshot.access}
      authorize={(operation) => session.authorize(operation)}
      gateway={gateway}
      onBookingChange={onBookingChange}
      initialProposal={cachedProposal}
      onProposalUpdated={workspace?.refresh ?? workspace?.reload}
    />
  );
}

function AccessState({ children, title }: Readonly<{ children?: React.ReactNode; title: string }>) {
  return (
    <div className="collab-access-state">
      <p className="collab-kicker">Hỷ Yến</p>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
