'use client';

import { useMemo, useState } from 'react';
import { guestApi, type Guest, type GuestGroup } from './guest-api';
import { usePersonalInvitationLink } from './use-personal-invitation-link';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import type { GuestStatusFilter } from './use-guests-workspace';

/** Chuẩn hoá chuỗi tiếng Việt để tìm kiếm không phụ thuộc dấu / chữ hoa thường. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface UseGuestListCardOptions {
  bookingId: string;
  groups: GuestGroup[];
  guests: Guest[];
  status: GuestStatusFilter;
  onChanged: (guest?: Guest, action?: 'create' | 'update') => void;
}

export function useGuestListCard({
  bookingId,
  groups,
  guests,
  status,
  onChanged,
}: UseGuestListCardOptions) {
  const { confirm, prompt, dialog } = useConfirmDialog();
  const { command, link, issueLink, sendLink, clearLink } = usePersonalInvitationLink(
    bookingId,
    (guestName) =>
      prompt({
        title: 'Gửi thiệp riêng qua email',
        label: `Email người nhận thiệp của ${guestName}`,
        type: 'email',
        placeholder: 'ten@vidu.com',
        confirmLabel: 'Gửi email',
      }),
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [modalState, setModalState] = useState<{ open: boolean; guest?: Guest | null }>({
    open: false,
    guest: null,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeGroups = useMemo(
    () => groups.filter((group) => group.status === 'ACTIVE'),
    [groups],
  );
  const groupMap = useMemo(
    () => new Map(groups.map((group) => [group.guestGroupId, group])),
    [groups],
  );

  // Lọc theo tìm kiếm (tên, SĐT, ghi chú) và nhóm
  const visible = useMemo(() => {
    const query = normalizeSearch(searchQuery);
    return guests.filter((guest) => {
      if (groupFilter && guest.guestGroupId !== groupFilter) return false;
      if (!query) return true;
      const matchName = normalizeSearch(guest.name).includes(query);
      const matchPhone = guest.phone ? normalizeSearch(guest.phone).includes(query) : false;
      const matchNote = guest.operationalNote
        ? normalizeSearch(guest.operationalNote).includes(query)
        : false;
      return matchName || matchPhone || matchNote;
    });
  }, [guests, groupFilter, searchQuery]);

  // Quản lý chọn checkbox hàng loạt
  const allVisibleSelected =
    visible.length > 0 && visible.every((g) => selectedIds.has(g.guestId));
  const someVisibleSelected = visible.some((g) => selectedIds.has(g.guestId));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((g) => g.guestId)));
    }
  };

  const toggleSelectOne = (guestId: string) => {
    const next = new Set(selectedIds);
    if (next.has(guestId)) next.delete(guestId);
    else next.add(guestId);
    setSelectedIds(next);
  };

  const [linkGuest, setLinkGuest] = useState<Guest | null>(null);

  // Thao tác hàng loạt: chuyển nhóm
  const handleBulkMoveGroup = async (targetGroupId: string) => {
    if (!targetGroupId || selectedIds.size === 0) return;
    const targetGroup = groupMap.get(targetGroupId);
    if (
      !(await confirm({
        title: `Chuyển ${selectedIds.size} khách sang nhóm “${targetGroup?.name}”?`,
        description: 'Tất cả khách được chọn sẽ được cập nhật nhóm mới ngay lập tức.',
        confirmLabel: 'Chuyển nhóm',
      }))
    )
      return;

    const selectedGuests = guests.filter((g) => selectedIds.has(g.guestId));
    const results = await command.run(
      async (token) => {
        const updatedList: Guest[] = [];
        for (const g of selectedGuests) {
          const res = await guestApi.updateGuest(token, crypto.randomUUID(), bookingId, g.guestId, {
            expectedRevision: g.revision,
            guestGroupId: targetGroupId,
          });
          updatedList.push(res);
        }
        return updatedList;
      },
      `Đã chuyển ${selectedGuests.length} khách sang nhóm “${targetGroup?.name}”.`,
    );

    if (results) {
      for (const res of results) {
        onChanged(res, 'update');
      }
      setSelectedIds(new Set());
    }
  };

  // Thao tác hàng loạt: lưu trữ / khôi phục
  const handleBulkToggleStatus = async () => {
    if (selectedIds.size === 0) return;
    const isArchiving = status === 'ACTIVE';
    if (
      isArchiving &&
      !(await confirm({
        title: `Lưu trữ ${selectedIds.size} khách đã chọn?`,
        description:
          'Khách sẽ bị ẩn khỏi danh sách đang dùng và liên kết thiệp riêng đã gửi sẽ bị thu hồi. Bạn có thể khôi phục lại sau.',
        confirmLabel: 'Lưu trữ khách',
        tone: 'danger',
      }))
    )
      return;

    const selectedGuests = guests.filter((g) => selectedIds.has(g.guestId));
    const results = await command.run(
      async (token) => {
        const updatedList: Guest[] = [];
        for (const g of selectedGuests) {
          const res = await guestApi.updateGuest(token, crypto.randomUUID(), bookingId, g.guestId, {
            expectedRevision: g.revision,
            status: isArchiving ? 'ARCHIVED' : 'ACTIVE',
          });
          updatedList.push(res);
        }
        return updatedList;
      },
      isArchiving
        ? `Đã lưu trữ ${selectedGuests.length} khách.`
        : `Đã khôi phục ${selectedGuests.length} khách.`,
    );

    if (results) {
      for (const res of results) {
        onChanged(res, 'update');
      }
      setSelectedIds(new Set());
    }
  };

  const handleToggleGuestStatus = async (guest: Guest) => {
    if (
      guest.status === 'ACTIVE' &&
      !(await confirm({
        title: `Lưu trữ khách “${guest.name}”?`,
        description:
          'Khách sẽ bị ẩn khỏi danh sách đang dùng và liên kết thiệp riêng đã gửi sẽ bị thu hồi. Bạn có thể khôi phục lại sau.',
        confirmLabel: 'Lưu trữ khách',
        tone: 'danger',
      }))
    )
      return;
    const result = await command.run(
      (token, key) =>
        guestApi.updateGuest(token, key, bookingId, guest.guestId, {
          expectedRevision: guest.revision,
          status: guest.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
        }),
      guest.status === 'ACTIVE'
        ? 'Đã lưu trữ khách (liên kết riêng bị thu hồi).'
        : 'Đã khôi phục khách.',
    );
    if (result) onChanged(result, 'update');
  };

  return {
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
    confirm,
    dialog,
  };
}

export type GuestListCardState = ReturnType<typeof useGuestListCard>;
