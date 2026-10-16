import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Hồ sơ & bảo mật | Hỷ Yến', robots: { index: false } };

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
