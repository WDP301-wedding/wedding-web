'use client';

import { tableCapacityMessage } from '../../lib/table-capacity';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { cn } from 'cn';

import { buttonVariants } from '../../components/ui/button';
import { JourneyStepper, journeySteps } from '../../design-system/journey-stepper';
import { CancellationModal } from './cancellation-modal';
import { OverviewAliasModal } from './overview-alias-modal';
import { OverviewMultiBookings } from './overview-multi-bookings';
import { OverviewNextSteps } from './overview-next-steps';
import { currentJourneyIndex } from './overview-progress';
import { OverviewNotifications } from './overview-notifications';
import { daysUntil, nextTasks } from './overview-tasks';
import { menuLines } from './proposal-menus';
import { panel, panelTitle } from './space-classes';
import { SpaceGate } from './space-gate';
import { useSpaceExtras } from './space-provider';
import { useAliasDialog, useLatestNotifications } from './use-overview';
import { useOverviewSettlement } from './use-overview-settlement';
import {
  bookingDisplayName,
  bookingPhaseLabel,
  eventTypeLabel,
  formatEventDate,
  isEventPast,
  shiftLabel,
  useCoupleWorkspace,
} from './use-couple-workspace';

export { daysUntil, nextTasks, type Task } from './overview-tasks';

const heroChip = 'rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white';

export function SpaceOverview() {
  return (
    <SpaceGate label="Đang mở tổng quan…">
      <OverviewContent />
    </SpaceGate>
  );
}

function OverviewContent() {
  const { state, bookings, bookingId, reload } = useCoupleWorkspace();
  const { restaurant } = useSpaceExtras();
  const ready = state.status === 'ready';
  const settlement = useOverviewSettlement(ready ? state.proposal : null);
  const summary = bookings.find((booking) => booking.bookingId === bookingId);
  const inbox = useLatestNotifications(ready);
  const aliasDialog = useRef<HTMLDialogElement>(null);
  const aliasTrigger = useRef<HTMLButtonElement>(null);
  const alias = useAliasDialog(
    ready ? state.proposal.bookingId : undefined,
    summary,
    reload,
    aliasDialog,
    aliasTrigger,
  );
  const proposalPhase = ready ? state.proposal.phase : undefined;
  const [cancellationModalOpen, setCancellationModalOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (!bookingId || proposalPhase !== 'CANCELLED') return false;
    try {
      return !localStorage.getItem(`wedding.cancellation_ack.${bookingId}`);
    } catch {
      return false;
    }
  });

  const handleCloseCancellationModal = () => {
    setCancellationModalOpen(false);
    if (bookingId) {
      try {
        localStorage.setItem(`wedding.cancellation_ack.${bookingId}`, 'true');
      } catch {
        // Storage blocked
      }
    }
  };

  if (!ready) return null;
  const proposal = state.proposal;
  const step = currentJourneyIndex(proposal);
  const days = daysUntil(proposal.eventDate);
  const tasks = nextTasks(proposal, summary, days, settlement.status);
  const completed = proposal.phase === 'COMPLETED';
  const { proposal: offer } = proposal;

  return (
    <div className="flex flex-col gap-6 lg:gap-7">
      <h1 className="sr-only">Tổng quan tiệc cưới</h1>
      <CancellationModal
        isOpen={cancellationModalOpen}
        onClose={handleCloseCancellationModal}
        bookingId={proposal.bookingId}
        hallName={offer.hall.name}
        eventDate={proposal.eventDate}
        shiftCode={offer.shift.code}
        publicPhone={restaurant?.publicPhone}
      />
      {proposal.phase === 'CANCELLED' ? (
        <div
          className="flex flex-col gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
          role="status"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold">
              <span className="flex size-2 rounded-full bg-destructive" aria-hidden="true" />
              Tiệc cưới đã huỷ
            </div>
            <button
              type="button"
              onClick={() => setCancellationModalOpen(true)}
              className="text-xs font-semibold text-destructive underline transition hover:opacity-80"
            >
              Xem chi tiết thông báo
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Hồ sơ tiệc cưới này được lưu trữ để hai bạn xem lại hợp đồng và giao dịch. Các chức năng
            chuẩn bị khách mời, sơ đồ bàn và in thiệp đã ngừng hoạt động.
          </p>
        </div>
      ) : (proposal.phase === 'DRAFT' || proposal.phase === 'AWAITING_DEPOSIT') &&
        isEventPast(proposal.eventDate) ? (
        <div
          className="flex flex-col gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
          role="status"
        >
          <div className="flex items-center gap-2 font-bold">
            <span className="flex size-2 rounded-full bg-destructive" aria-hidden="true" />
            Hồ sơ đã quá ngày tổ chức dự kiến
          </div>
          <p className="text-xs text-muted-foreground">
            Ngày tổ chức dự kiến ({formatEventDate(proposal.eventDate)}) đã qua nhưng tiệc cưới chưa
            hoàn tất thủ tục đặt cọc và xác nhận. Hai bạn vui lòng liên hệ nhà hàng để được hỗ trợ
            dời ngày hoặc xử lý đóng hồ sơ.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold sm:text-2xl">
            {summary ? bookingDisplayName(summary) : offer.hall.name}
          </h2>
          <button
            type="button"
            ref={aliasTrigger}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            aria-haspopup="dialog"
            onClick={alias.openDialog}
            title="Đặt tên gợi nhớ cho tiệc này"
          >
            {summary?.alias ? 'Đổi tên gợi nhớ' : 'Đặt tên gợi nhớ'}
          </button>
        </div>
        {summary?.alias ? (
          <p className="text-sm text-muted-foreground">
            Sảnh {offer.hall.name} · {shiftLabel(offer.shift.code)}
          </p>
        ) : null}
      </div>

      <header className="relative isolate flex min-h-60 flex-wrap items-end justify-between gap-6 overflow-hidden rounded-2xl bg-hy-ink p-5 text-white sm:p-8">
        <Image
          className="-z-20 object-cover"
          src="/images/hero-sanh-tiec-1080.webp"
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1120px"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgb(43_29_34/0.88),rgb(43_29_34/0.35)_75%)]"
          aria-hidden="true"
        />
        <div className="flex items-baseline gap-2.5">
          {completed ? (
            <span className="text-2xl font-bold">Tiệc đã hoàn thành</span>
          ) : days > 0 ? (
            <>
              <span className="text-5xl leading-none font-bold tabular-nums sm:text-6xl">
                {days}
              </span>
              <span className="text-base font-semibold sm:text-lg">ngày nữa tới tiệc</span>
            </>
          ) : days === 0 ? (
            <span className="text-2xl font-bold">Hôm nay là ngày tiệc!</span>
          ) : (
            <span className="text-xl font-semibold">Tiệc đã diễn ra</span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end sm:text-right">
          <p className="text-lg font-bold tabular-nums">{formatEventDate(proposal.eventDate)}</p>
          <p className="text-sm text-white/90">
            {eventTypeLabel(summary?.eventType)} · Sảnh {offer.hall.name} ·{' '}
            {shiftLabel(offer.shift.code)} ({offer.shift.startTime}–{offer.shift.endTime})
          </p>
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            <span className={heroChip}>
              {bookingPhaseLabel(proposal.phase, proposal.eventDate)}
            </span>
            <span className={heroChip}>{proposal.planningHeadcount} khách dự kiến</span>
            <span className={heroChip}>{offer.tableCount} bàn</span>
            <span className={heroChip}>{menuLines(offer).length} thực đơn</span>
          </div>
        </div>
      </header>
      {proposal.capacity?.issue ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {tableCapacityMessage(
            proposal.planningHeadcount,
            offer.tableCount,
            proposal.capacity.maximumTables,
            offer.hall.maxGuests,
          )}{' '}
          Thỏa thuận đã duyệt được giữ nguyên; hãy liên hệ nhà hàng để điều chỉnh.
        </p>
      ) : null}
      <section className={cn(panel, 'flex flex-col gap-4')} aria-labelledby="journey-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="journey-title" className={panelTitle}>
            Hành trình cưới
          </h2>
          <span className="text-xs text-muted-foreground">
            {completed
              ? 'Tiệc đã hoàn thành'
              : (proposal.phase === 'DRAFT' || proposal.phase === 'AWAITING_DEPOSIT') &&
                  isEventPast(proposal.eventDate)
                ? 'Hành trình tạm dừng (quá hạn tổ chức)'
                : step < 0
                  ? 'Tiệc đã huỷ'
                  : `Bước ${step + 1}/6 · ${journeySteps[step]}`}
          </span>
        </div>
        <JourneyStepper current={step} completed={completed && settlement.status === 'settled'} />
        {settlement.error ? (
          <p role="status" className="text-sm text-muted-foreground">
            Chưa tải được tình trạng quyết toán.{' '}
            <button
              type="button"
              className="text-primary underline"
              onClick={() => void settlement.retry()}
            >
              Tải lại quyết toán
            </button>
          </p>
        ) : null}
        <OverviewNextSteps tasks={tasks} />
      </section>

      <OverviewMultiBookings bookings={bookings} proposal={proposal} />

      <OverviewNotifications inbox={inbox} bookingId={proposal.bookingId} />

      <OverviewAliasModal
        isOpen={alias.open}
        dialogRef={aliasDialog}
        hasExistingAlias={Boolean(summary?.alias)}
        aliasInput={alias.input}
        setAliasInput={alias.setInput}
        savingAlias={alias.saving}
        aliasError={alias.error}
        onClose={alias.close}
        onSave={(event) => void alias.save(event)}
      />
    </div>
  );
}
