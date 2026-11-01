'use client';

import React from 'react';
import { guestApi, type Guest, type GuestGroup } from './guest-api';
import { Illustration } from '../../design-system/illustrations';
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
  onStatusChange,
  onChanged,
}: Readonly<{
  bookingId: string;
  groups: GuestGroup[];
  guests: Guest[];
  status: GuestStatusFilter;
  onStatusChange: (status: GuestStatusFilter) => void;
  onChanged: (guest?: Guest, action?: 'create' | 'update') => void;
}>) {
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
    <section className={cx.card}>
      <div className={cx.cardHeader}>
        <div>
          <h2>Danh sách tên khách</h2>
          <span className={gx.guestCountBadge}>
            Hiển thị {visible.length} / {guests.length} khách
            {status === 'ARCHIVED' ? ' (Đã lưu trữ)' : ''}
          </span>
        </div>
        <div className={cx.actions}>
          {status === 'ACTIVE' ? (
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
            <span className={cx.muted}>
              Trạng thái
            </span>
            <select
              className={gx.filterSelect}
              value={status}
              onChange={(e) => {
                onStatusChange(e.target.value as GuestStatusFilter);
                setSelectedIds(new Set());
              }}
            >
              <option value="ACTIVE">Đang mời</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-1.5">
            <span className={cx.muted}>
              Nhóm
            </span>
            <select
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
            </select>
          </label>
        </div>
      </div>

      {/* Bảng Danh sách Desktop & Thẻ Mobile */}
      {visible.length === 0 ? (
        <p className={gx.noteIllustrated}>
          {status === 'ACTIVE' && !searchQuery && !groupFilter ? (
            <Illustration name="empty-khach" size={64} />
          ) : null}
          {searchQuery || groupFilter
            ? 'Không tìm thấy khách nào khớp với bộ lọc.'
            : status === 'ACTIVE'
              ? 'Chưa có tên khách nào. Bạn vẫn dùng được nhóm, sơ đồ bàn, thiệp và in mà không cần danh sách tên.'
              : 'Không có khách đã lưu trữ.'}
        </p>
      ) : (
        <>
          <GuestTableView
            visible={visible}
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
      {selectedIds.size > 0 ? (
        <div className={gx.bulkBar} role="region" aria-label="Thao tác hàng loạt">
          <div className={gx.bulkInfo}>Đã chọn {selectedIds.size} khách mời</div>
          <div className={gx.bulkActions}>
            {status === 'ACTIVE' ? (
              <label className="inline-flex items-center gap-1.5">
                <span className={cx.muted}>Chuyển sang:</span>
                <select
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
                </select>
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
        isOpen={modalState.open}
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
        link={link}
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

      {dialog}
    </section>
  );
}
