import '@testing-library/jest-dom/vitest';
import { act, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { afterEach, beforeAll } from 'vitest';
import { AppToaster } from '../design-system/toast';

// Toast (sonner) được gắn một lần ở app/layout.tsx. Trong test, component được render riêng lẻ nên
// gắn sẵn một Toaster vào <body> để `screen.findByText(...)` vẫn thấy thông báo thành công/lỗi.
beforeAll(() => {
  if (typeof document === 'undefined') return;
  const host = document.createElement('div');
  host.setAttribute('data-testid', 'toaster-host');
  document.body.appendChild(host);
  act(() => createRoot(host).render(createElement(AppToaster)));
});

afterEach(() => {
  cleanup();
  // Xoá toast còn lại để test sau không thấy thông báo của test trước.
  act(() => {
    toast.dismiss();
  });
});
