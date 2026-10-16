'use client';

import { useEffect } from 'react';

const tokenFragment = /(?:^|&)(?:invitationToken|resetToken)=|^wi[ip]_/u;

/**
 * Link cũ dạng `/#invitationToken=…` hoặc `/#wip_…` (trang chủ bản cũ tự mở form lời mời).
 * Trang chủ v2 là Server Component nên không xử lý mã nữa → chuyển sang /loi-moi, GIỮ nguyên
 * #fragment (không đưa mã vào query hay gửi lên server). Không có mã thì không làm gì.
 */
export function CredentialForward() {
  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (tokenFragment.test(fragment)) window.location.replace(`/loi-moi#${fragment}`);
  }, []);
  return null;
}
