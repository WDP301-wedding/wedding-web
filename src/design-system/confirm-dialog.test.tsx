import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useConfirmDialog } from './confirm-dialog';

function Harness({ onResult }: Readonly<{ onResult: (value: unknown) => void }>) {
  const { confirm, prompt, dialog } = useConfirmDialog();
  const [outerSubmits, setOuterSubmits] = useState(0);
  return (
    // Form bao ngoài: hộp thoại không được submit nhầm form này.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setOuterSubmits((value) => value + 1);
      }}
    >
      <output aria-label="outer submits">{outerSubmits}</output>
      <button
        type="button"
        onClick={() =>
          void confirm({ title: 'Xoá mục?', tone: 'danger', confirmLabel: 'Xoá' }).then(onResult)
        }
      >
        Mở xác nhận
      </button>
      <button
        type="button"
        onClick={() =>
          void prompt({ title: 'Đổi tên', label: 'Tên mới', defaultValue: 'Cũ' }).then(onResult)
        }
      >
        Mở nhập
      </button>
      {dialog}
    </form>
  );
}

describe('useConfirmDialog', () => {
  it('resolves true on confirm without submitting the surrounding form', async () => {
    const onResult = vi.fn();
    render(<Harness onResult={onResult} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở xác nhận' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Xoá mục?' });
    // Thao tác nguy hiểm: focus mặc định ở nút Huỷ để Enter vô tình không xoá.
    expect(screen.getByRole('button', { name: 'Huỷ' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(dialog).not.toBeInTheDocument();
    expect(screen.getByLabelText('outer submits')).toHaveTextContent('0');
  });

  it('resolves false on cancel, Escape or backdrop click', async () => {
    const onResult = vi.fn();
    render(<Harness onResult={onResult} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở xác nhận' }));
    fireEvent.keyDown(await screen.findByRole('alertdialog'), { key: 'Escape' });
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(false));
    fireEvent.click(screen.getByRole('button', { name: 'Mở xác nhận' }));
    await screen.findByRole('alertdialog');
    fireEvent.mouseDown(document.querySelector('.hy-dialog-backdrop')!);
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(onResult).toHaveBeenLastCalledWith(false);
  });

  it('returns the trimmed text from a prompt and blocks empty values', async () => {
    const onResult = vi.fn();
    render(<Harness onResult={onResult} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở nhập' }));
    const input = await screen.findByLabelText('Tên mới');
    expect(input).toHaveValue('Cũ');
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '  Nhà trai  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Nhà trai'));
    expect(screen.getByLabelText('outer submits')).toHaveTextContent('0');
  });
});
