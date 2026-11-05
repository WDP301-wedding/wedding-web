'use client';
import { HySelect } from '../../components/ui/select-field';

import React, { useId, useState } from 'react';
import { guestApi, type Guest, type GuestGroup } from './guest-api';
import { GuestModal } from './guest-modal';
import { GuestLinkModal } from './guest-link-modal';
import type { GuestStatusFilter } from './use-guests-workspace';
import { useGuestListCard } from './use-guest-list-card';
import { GuestTableView } from './guest-table-view';
import { GuestCardList } from './guest-card-list';
import { buttonVariants } from '../../components/ui/button';
import { cx } from '../commercial-contract/contract-classes';
import { gx } from './guest-classes';

export function GuestListCard({
  bookingId,
  groups,
  guests,
  status,
  readOnly = false,
  onStatusChange,
  onChanged,
  importPanel,
}: Readonly<{
  importPanel?: React.ReactNode;
  bookingId: string;
  groups: GuestGroup[];
  guests: Guest[];
  status: GuestStatusFilter;
  readOnly?: boolean;
  onStatusChange: (status: GuestStatusFilter) => void;
  onChanged: (guest?: Guest, action?: 'create' | 'update') => void;
}>) {
  const [importOpen, setImportOpen] = useState(false);
  const importId = useId();
  const {
    searchQuery,
    setSearchQuery,
    groupFilter,
    setGroupFilter,
    modalState,
    setModalState,
    selectedIds,
    setSelectedIds,
    activeGroups,
    groupMap,
    visible,
    allVisibleSelected,
    someVisibleSelected,
    toggleSelectAll,
    toggleSelectOne,
    linkGuest,
    setLinkGuest,
    command,
    link,
    issueLink,
    sendLink,
    clearLink,
    handleBulkMoveGroup,
    handleBulkToggleStatus,
    handleToggleGuestStatus,
    dialog,
  } = useGuestListCard({
    bookingId,
    groups,
    guests,
    status,
    onChanged,
  });

  return (
    <section className={gx.card}>
      <div className={gx.cardHeader}>
        <div>
          <h2>Danh sách tên khách</h2>
          <span className={gx.guestCountBadge}>
            Hiển thị {visible.length} / {guests.length} khách
            {status === 'ARCHIVED' ? ' (Đã lưu trữ)' : ''}
          </span>
        </div>
        <div className={cx.actions}>
          {!readOnly && importPanel ? (
            <button
              className={cx.buttonOutline}
              type="button"
              aria-expanded={importOpen}
              aria-controls={importId}
              onClick={() => setImportOpen((value) => !value)}
            >
              {importOpen ? 'Đóng phần nhập CSV' : 'Nhập CSV'}
            </button>
          ) : null}
          {!readOnly && status === 'ACTIVE' ? (
            <button
              className={cx.button}
              type="button"
              disabled={command.pending || activeGroups.length === 0}
              onClick={() => setModalState({ open: true, guest: null })}
            >
              + Thêm khách
            </button>
          ) : null}
        </div>
      </div>

      {!readOnly && importPanel ? (
        <div
          id={importId}
          className={
            importOpen ? 'block rounded-lg border border-border bg-muted/40 p-4' : 'hidden'
          }
        >
          {importPanel}
        </div>
      ) : null}

      {/* Toolbar Tìm kiếm & Lọc */}
      <div className={gx.toolbar}>
        <div className={gx.searchWrap}>
          <input
            type="search"
            className={gx.searchInput}
            placeholder="Tìm theo tên, SĐT, ghi chú…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm khách mời"
          />
          {searchQuery ? (
            <button
              type="button"
              className={gx.clearSearch}
              onClick={() => setSearchQuery('')}
              aria-label="Xoá tìm kiếm"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className={gx.filterRow}>
          <label className="inline-flex items-center gap-1.5">
            <span className={cx.muted}>Trạng thái</span>
            <HySelect
              className={gx.filterSelect}
              value={status}
              onChange={(e) => {
                onStatusChange(e.target.value as GuestStatusFilter);
                setSelectedIds(new Set());
              }}
            >
              <option value="ACTIVE">Đang mời</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
            </HySelect>
          </label>

          <label className="inline-flex items-center gap-1.5">
            <span className={cx.muted}>Nhóm</span>
            <HySelect
              className={gx.filterSelect}
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="">Tất cả các nhóm</option>
              {groups.map((group) => (
                <option key={group.guestGroupId} value={group.guestGroupId}>
                  {group.name}
                </option>
              ))}
            </HySelect>
          </label>
        </div>
      </div>

      {/* Bảng Danh sách Desktop & Thẻ Mobile */}
      {visible.length === 0 ? (
        <p className="rounded-lg bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
          {searchQuery || groupFilter
            ? 'Không tìm thấy khách nào khớp với bộ lọc.'
            : status === 'ACTIVE'
              ? 'Chưa có tên khách. Bạn vẫn sử dụng được nhóm, sơ đồ bàn và thiệp.'
              : 'Không có khách đã lưu trữ.'}
        </p>
      ) : (
        <>
          <GuestTableView
            visible={visible}
            readOnly={readOnly}
            selectedIds={selectedIds}
            allVisibleSelected={allVisibleSelected}
            someVisibleSelected={someVisibleSelected}
            groupMap={groupMap}
            pending={command.pending}
            onToggleSelectAll={toggleSelectAll}
            onToggleSelectOne={toggleSelectOne}
            onEdit={(guest) => setModalState({ open: true, guest })}
            onIssueLink={(guest) => {
              setLinkGuest(guest);
              void issueLink(guest);
            }}
            onSendEmail={(guest) => void sendLink(guest)}
            onToggleStatus={(guest) => {
              void handleToggleGuestStatus(guest);
            }}
          />

          <GuestCardList
            visible={visible}
            readOnly={readOnly}
            selectedIds={selectedIds}
            groupMap={groupMap}
            pending={command.pending}
            onToggleSelectOne={toggleSelectOne}
            onEdit={(guest) => setModalState({ open: true, guest })}
            onIssueLink={(guest) => {
              setLinkGuest(guest);
              void issueLink(guest);
            }}
            onSendEmail={(guest) => void sendLink(guest)}
            onToggleStatus={(guest) => {
              void handleToggleGuestStatus(guest);
            }}
          />
        </>
      )}

      {/* Thanh Thao tác hàng loạt (Bulk Bar) khi có chọn */}
      {!readOnly && selectedIds.size > 0 ? (
        <div className={gx.bulkBar} role="region" aria-label="Thao tác hàng loạt">
          <div className={gx.bulkInfo}>Đã chọn {selectedIds.size} khách mời</div>
          <div className={gx.bulkActions}>
            {status === 'ACTIVE' ? (
              <label className="inline-flex items-center gap-1.5">
                <span className={cx.muted}>Chuyển sang:</span>
                <HySelect
                  className={`${gx.filterSelect} h-9`}
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      void handleBulkMoveGroup(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>
                    Chọn nhóm đích…
                  </option>
                  {activeGroups.map((g) => (
                    <option key={g.guestGroupId} value={g.guestGroupId}>
                      {g.name}
                    </option>
                  ))}
                </HySelect>
              </label>
            ) : null}

            <button
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              type="button"
              disabled={command.pending}
              onClick={() => void handleBulkToggleStatus()}
            >
              {status === 'ACTIVE' ? 'Lưu trữ đã chọn' : 'Khôi phục đã chọn'}
            </button>

            <button
              className={cx.textButton}
              type="button"
              onClick={() => setSelectedIds(new Set())}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      ) : null}

      {/* Modal Thêm / Chỉnh sửa khách */}
      <GuestModal
        isOpen={!readOnly && modalState.open}
        {...(modalState.guest ? { guest: modalState.guest } : {})}
        groups={activeGroups}
        pending={command.pending}
        onClose={() => setModalState({ open: false, guest: null })}
        onSubmit={async (data) => {
          if (modalState.guest) {
            const target = modalState.guest;
            const res = await command.run(
              (token, key) =>
                guestApi.updateGuest(token, key, bookingId, target.guestId, {
                  expectedRevision: target.revision,
                  name: data.name,
                  guestGroupId: data.guestGroupId,
                  phone: data.phone,
                  operationalNote: data.note,
                }),
              'Đã lưu thông tin khách.',
            );
            if (res) {
              setModalState({ open: false, guest: null });
              onChanged(res, 'update');
            }
          } else {
            const res = await command.run(
              (token, key) =>
                guestApi.createGuest(token, key, bookingId, {
                  name: data.name,
                  guestGroupId: data.guestGroupId,
                  phone: data.phone,
                  operationalNote: data.note,
                }),
              'Đã thêm khách mời mới.',
            );
            if (res) {
              setModalState({ open: false, guest: null });
              onChanged(res, 'create');
            }
          }
        }}
      />

      {/* Modal hiển thị Liên kết thiệp riêng */}
      <GuestLinkModal
        link={readOnly ? null : link}
        onClose={() => {
          clearLink();
          setLinkGuest(null);
        }}
        onSendEmail={
          linkGuest
            ? () => {
                void sendLink(linkGuest);
              }
            : undefined
        }
      />

      {!readOnly && dialog}
    </section>
  );
}
