'use client';

import { useState } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { useCommand } from '../couple-workspace/use-couple-workspace';
import {
  guestApi,
  readLinkRevision,
  rememberLinkRevision,
  type Guest,
  type PersonalLink,
} from './guest-api';

export type IssuedPersonalLink = {
  guestName: string;
  url: string;
  expiresAt: string;
};

export function usePersonalInvitationLink(bookingId: string) {
  const command = useCommand();
  const [link, setLink] = useState<IssuedPersonalLink | null>(null);

  /**
   * Cấp link thiệp cá nhân. Credential chỉ trả về MỘT lần nên phải hiển thị ngay để copy.
   * Nếu revision đã lưu bị cũ, thử revision tiếp theo (mỗi lần dùng Idempotency-Key mới).
   */
  const issueLink = (guest: Guest) =>
    command
      .run(
        async (token) => {
          let revision = readLinkRevision(bookingId, guest.guestId);
          for (let attempt = 0; attempt < 10; attempt += 1) {
            try {
              const issued: PersonalLink = await guestApi.issueLink(
                token,
                crypto.randomUUID(),
                bookingId,
                guest.guestId,
                revision,
              );
              rememberLinkRevision(bookingId, guest.guestId, issued.revision);
              return issued;
            } catch (error) {
              if (
                error instanceof ApiClientError &&
                error.code === 'GUEST_INVITATION_REVISION_STALE'
              ) {
                revision += 1;
                continue;
              }
              throw error;
            }
          }
          throw new Error('Không xác định được phiên bản liên kết hiện tại. Hãy thử lại sau.');
        },
        undefined,
        {
          INVITATION_LINK_UNAVAILABLE:
            'Chưa thể cấp liên kết: hãy xuất bản thiệp trước, hoặc tiệc đã kết thúc.',
        },
      )
      .then((issued) => {
        if (issued)
          setLink({
            guestName: guest.name,
            url: `${window.location.origin}/invitation/personal${issued.fragment}`,
            expiresAt: issued.expiresAt,
          });
      });

  const sendLink = (guest: Guest) => {
    const email = window.prompt(`Email người nhận thiệp của ${guest.name}`)?.trim();
    if (!email) return;
    void command.run(
      async (token) => {
        let revision = readLinkRevision(bookingId, guest.guestId);
        for (let attempt = 0; attempt < 10; attempt += 1) {
          try {
            const sent = await guestApi.deliverLink(
              token,
              crypto.randomUUID(),
              bookingId,
              guest.guestId,
              revision,
              email,
            );
            rememberLinkRevision(bookingId, guest.guestId, sent.revision);
            return sent;
          } catch (error) {
            if (
              error instanceof ApiClientError &&
              error.code === 'GUEST_INVITATION_REVISION_STALE'
            ) {
              revision += 1;
              continue;
            }
            throw error;
          }
        }
        throw new Error('Không xác định được phiên bản liên kết hiện tại.');
      },
      `Đã xếp lịch gửi thiệp tới ${email}. Liên kết cũ của khách này (nếu có) đã bị thu hồi.`,
      {
        GUEST_DELIVERY_UNAVAILABLE:
          'Hệ thống gửi email đang tạm tắt. Hãy dùng “Lấy liên kết” để tự gửi.',
        INVITATION_LINK_UNAVAILABLE: 'Chưa thể gửi: hãy xuất bản thiệp trước.',
      },
    );
  };

  const clearLink = () => setLink(null);

  return {
    command,
    link,
    issueLink,
    sendLink,
    clearLink,
  };
}
