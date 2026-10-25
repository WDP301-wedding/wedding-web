import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EstimatorHero } from './estimator';
import type { Hall, Menu } from './public-api';

const mockHalls: Hall[] = [
  {
    id: 'hall-1',
    name: 'Sảnh Kim Cương',
    maxGuests: 400,
    description: 'Sảnh lớn',
    media: [],
  },
  {
    id: 'hall-2',
    name: 'Sảnh Ngọc Trai',
    maxGuests: 200,
    description: 'Sảnh nhỏ',
    media: [],
  },
  {
    id: 'hall-3',
    name: 'Sảnh Hoàng Gia',
    maxGuests: 300,
    description: 'Sảnh vừa',
    media: [],
  },
];

const mockMenus: Menu[] = [
  {
    id: 'menu-1',
    name: 'Thực đơn Tiêu Chuẩn',
    priceVndPerTable: 4_500_000,
    description: 'Tiết kiệm',
    items: [],
    media: [],
  },
  {
    id: 'menu-2',
    name: 'Thực đơn Cao Cấp',
    priceVndPerTable: 5_500_000,
    description: 'Đầy đủ',
    items: [],
    media: [],
  },
];

describe('EstimatorHero component', () => {
  it('renders and displays estimate results when clicking "Xem ước tính"', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );

    render(
      <EstimatorHero
        intro={<h1>Tiêu đề giới thiệu</h1>}
        halls={mockHalls}
        menus={mockMenus}
        restaurant={null}
      />
    );

    // Initial state: form is rendered with default 280 guests
    expect(screen.getByText('Ước tính tiệc của bạn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem ước tính' })).toBeInTheDocument();
    expect(screen.queryByText(/28 bàn/)).not.toBeInTheDocument();

    // Click "Xem ước tính" with default 280 guests
    fireEvent.click(screen.getByRole('button', { name: 'Xem ước tính' }));

    // Estimate results section should now appear!
    expect(screen.getByText(/280 khách · 28 bàn · Ca trưa/)).toBeInTheDocument();
    expect(screen.getByText('Ước tính – chưa giữ chỗ')).toBeInTheDocument();

    // Sảnh vừa nhất (Hoàng Gia 300 khách) should be displayed with "Vừa nhất"
    expect(screen.getAllByText('Sảnh Hoàng Gia').length).toBeGreaterThan(0);
    expect(screen.getByText('Vừa nhất')).toBeInTheDocument();
    expect(screen.getByText(/Tối đa 300 khách · còn 20 chỗ/)).toBeInTheDocument();

    // Sảnh lớn (Kim Cương 400 khách) should also be displayed
    expect(screen.getAllByText('Sảnh Kim Cương').length).toBeGreaterThan(0);

    // Sảnh nhỏ (Ngọc Trai 200 khách) should NOT be displayed because guests = 280
    expect(screen.queryByText('Sảnh Ngọc Trai')).not.toBeInTheDocument();

    // Menus should be calculated: 28 bàn * 4.500.000 = 126.000.000 ₫
    expect(screen.getByText('Thực đơn Tiêu Chuẩn')).toBeInTheDocument();
    expect(screen.getByText(/28 bàn × 4\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/126\.000\.000/)).toBeInTheDocument();

    // 28 bàn * 5.500.000 = 154.000.000 ₫
    expect(screen.getByText('Thực đơn Cao Cấp')).toBeInTheDocument();
    expect(screen.getByText(/28 bàn × 5\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/154\.000\.000/)).toBeInTheDocument();

    // CTA button with consultation link
    const cta = screen.getByRole('link', { name: /Gửi yêu cầu tư vấn với lựa chọn này/ });
    expect(cta).toHaveAttribute(
      'href',
      expect.stringContaining('/tu-van?sanh=hall-3&thuc-don=menu-2&khach=280&ca=trua')
    );
  });

  it('validates guest count and shows error message', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );

    render(
      <EstimatorHero
        intro={<h1>Tiêu đề giới thiệu</h1>}
        halls={mockHalls}
        menus={mockMenus}
        restaurant={null}
      />
    );

    const form = screen.getByRole('button', { name: 'Xem ước tính' }).closest('form')!;
    const guestsInput = form.querySelector('input[name="guests"]') as HTMLInputElement;
    guestsInput.value = '0';
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toHaveTextContent('Nhập số khách từ 1 đến 10.000.');
  });
});
