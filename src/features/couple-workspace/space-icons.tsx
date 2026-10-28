import React from 'react';
import Link from 'next/link';
import { routes } from '../../routes';

export type IconName =
  | 'home'
  | 'handshake'
  | 'wallet'
  | 'checklist'
  | 'receipt'
  | 'bell'
  | 'person'
  | 'lock'
  | 'call'
  | 'back'
  | 'more';

export const iconPaths: Record<IconName, string> = {
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z',
  handshake: 'M5 4h10l4 4v12H5ZM14 4v5h5M8 13h8m-8 4h5',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3ZM3 7V6a2 2 0 0 1 2-2h11M16 13.5h.01',
  checklist: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 8h6m-6 4h6m-6 4h3',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4ZM10 20a2 2 0 0 0 4 0',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  lock: 'M6 11h12v10H6ZM8 11V8a4 4 0 1 1 8 0v3',
  call: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  back: 'M10 6 4 12l6 6M4 12h16',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

export function Icon({ name }: Readonly<{ name: IconName }>) {
  return (
    <svg
      className="hy-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

export function SupportCard({ phone }: Readonly<{ phone: string | null }>) {
  return (
    <div className="hy-support">
      <Icon name="call" />
      <div>
        <strong>Cần hỗ trợ? Gọi nhà hàng</strong>
        {phone ? (
          <a href={`tel:${phone.replace(/[^+\d]/gu, '')}`}>{phone}</a>
        ) : (
          <Link href={routes.consultation}>Gửi lời nhắn</Link>
        )}
      </div>
    </div>
  );
}
