import '@testing-library/jest-dom/vitest';
import { act, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { AppToaster } from '../design-system/toast';

// Toast (sonner) được gắn một lần ở app/layout.tsx. Trong test, component được render riêng lẻ nên
// gắn sẵn một Toaster vào <body> để `screen.findByText(...)` vẫn thấy thông báo thành công/lỗi.
let toasterRoot: Root | undefined;
let toasterHost: HTMLDivElement | undefined;
beforeAll(async () => {
  if (typeof document === 'undefined') return;
  const host = document.createElement('div');
  host.setAttribute('data-testid', 'toaster-host');
  document.body.appendChild(host);
  toasterHost = host;
  toasterRoot = createRoot(host);
  await act(() => Promise.resolve().then(() => toasterRoot!.render(createElement(AppToaster))));
});

// This root is mounted outside Testing Library, so cleanup() does not own it.
// Unsubscribe Sonner and finish React's teardown while the DOM still exists.
afterAll(async () => {
  await act(() => Promise.resolve().then(() => toasterRoot?.unmount()));
  toasterHost?.remove();
  toasterRoot = undefined;
  toasterHost = undefined;
});

afterEach(() => {
  cleanup();
  // Xoá toast còn lại để test sau không thấy thông báo của test trước.
  act(() => {
    toast.dismiss();
  });
});
