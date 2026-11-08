'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLiveRefresh, LiveUpdateNotice } from '../realtime/use-live-refresh';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import { authorizedRead, type Proposal } from '../couple-workspace/use-couple-workspace';
import { contractApi, type ContractList, type CoupleProfile } from './contract-api';
import { Skeleton } from '../../design-system/skeleton';
import { routes, withBooking } from '../../routes';
import { CoupleNamesCard } from './couple-names-card';
import { ContractProgress } from './contract-progress';
import { CustomerSelections } from './customer-selections';
import { ContractCard } from './contract-card';
import { HistoryCard } from './contract-history-card';
import { cx } from './contract-classes';

/** `names` / `contract`: web v2 tách "Tên cô dâu chú rể" và "Hợp đồng" thành 2 bước của Thoả thuận. */
export type ContractSection = 'all' | 'names' | 'contract';

const sectionCopy: Record<ContractSection, { title: string; description: string }> = {
  all: {
    title: 'Hợp đồng tiệc cưới',
    description:
      'Thông tin cô dâu & chú rể, thực đơn và dịch vụ; hai bên cùng duyệt một phiên bản trước khi đặt cọc. Thiệp in được đặt riêng sau đặt cọc.',
  },
  names: {
    title: 'Tên cô dâu & chú rể',
    description: 'Tên được in trên hợp đồng và thiệp cưới. Cần có trước khi gửi duyệt hợp đồng.',
  },
  contract: {
    title: 'Hợp đồng tiệc cưới',
    description:
      'Thông tin cô dâu & chú rể, thực đơn và dịch vụ; hai bên cùng duyệt một phiên bản trước khi đặt cọc. Thiệp in được đặt riêng sau đặt cọc.',
  },
};

export function ContractPage({ section = 'all' }: Readonly<{ section?: ContractSection }> = {}) {
  return (
    <CouplePage title={sectionCopy[section].title} description={sectionCopy[section].description}>
      {(proposal, reload) => (
        <ContractWorkspace
          key={proposal.bookingId}
          proposal={proposal}
          reloadBooking={reload}
          section={section}
        />
      )}
    </CouplePage>
  );
}

function ContractWorkspace({
  proposal,
  reloadBooking,
  section,
}: Readonly<{ proposal: Proposal; reloadBooking: () => void; section: ContractSection }>) {
  const [contracts, setContracts] = useState<ContractList | null>(null);
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [editing, setEditing] = useState(false);
  const [writing, setWriting] = useState(false);
  const live = useLiveRefresh(
    async (isCurrent) => {
      try {
        const [list, coupleProfile] = await Promise.all([
          authorizedRead((token) => contractApi.list(token, proposal.bookingId)),
          authorizedRead((token) => contractApi.profile(token, proposal.consultationId)),
        ]);
        if (!isCurrent()) return;
        // A read started before saving must not overwrite the acknowledged draft.
        setContracts((current) =>
          current && current.bookingRevision > list.bookingRevision ? current : list,
        );
        setProfile(coupleProfile);
        setLoadError(null);
      } catch (error) {
        if (isCurrent()) setLoadError(describeApiError(error));
      }
    },
    {
      scope: proposal.bookingId,
      bookingId: proposal.bookingId,
      types: ['contract.updated', 'booking.updated', 'timeline.updated'],
      initial: true,
      blocked: writing || editing,
      invalidateOnBlock: true,
    },
  );
  const reload = () => {
    void live.refresh();
  };

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!contracts || !profile) return <Skeleton label="Đang tải hợp đồng…" />;

  const namesMissing = !profile.brideName || !profile.groomName;
  const showNames = section !== 'contract' || namesMissing;
  const showContract = section !== 'names';
  return (
    <>
      <LiveUpdateNotice waiting={live.waiting} />
      {showNames ? (
        <CoupleNamesCard
          profile={profile}
          onSaved={(next) => {
            setProfile(next);
          }}
        />
      ) : null}
      {section === 'names' ? (
        <div className={cx.nextStep}>
          <p>{namesMissing ? 'Lưu đủ tên hai bạn để tiếp tục.' : 'Tên đã sẵn sàng.'}</p>
          <Link className={cx.button} href={withBooking(routes.contract, proposal.bookingId)}>
            Tiếp tục tới Hợp đồng
          </Link>
        </div>
      ) : null}
      {showContract ? <ContractProgress contracts={contracts} phase={proposal.phase} /> : null}
      {showContract ? (
        <CustomerSelections
          planningHeadcount={proposal.planningHeadcount}
          maximumTables={proposal.capacity?.maximumTables}
          maxGuests={proposal.proposal.hall.maxGuests}
          contracts={contracts}
          bookingId={proposal.bookingId}
          onDirtyChange={setEditing}
          onWritingChange={setWriting}
          onChanged={(result) => {
            // Apply the acknowledged server revision before the background refresh.
            // Otherwise the editor waits for a read that dirty/write guards may defer.
            if (result)
              setContracts((current) =>
                current
                  ? {
                      ...current,
                      bookingRevision: result.bookingRevision,
                      customerSelection: result.selection,
                    }
                  : current,
              );
            reload();
            reloadBooking();
          }}
        />
      ) : null}
      {showContract ? (
        <ContractCard
          proposal={proposal}
          contracts={contracts}
          onWritingChange={setWriting}
          onChanged={() => {
            // Mỗi lệnh hợp đồng làm tăng revision của Booking → nạp lại cả booking lẫn hợp đồng.
            reload();
            reloadBooking();
          }}
        />
      ) : null}
      {showContract ? <HistoryCard contracts={contracts} bookingId={proposal.bookingId} /> : null}
    </>
  );
}
