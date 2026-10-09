'use client';
import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { createPublicGateway, type ConsultationRequest } from './public-api';
import { minimumPreferredDate } from './consultation-date';
import { ApiClientError } from '../../lib/api/client';
import Link from 'next/link';

function subscribeToDateChange(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener('focus', onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', onChange);
  };
}

const serverMinimumDate = () => '';

export function ConsultationForm({
  submit = createPublicGateway().submit,
}: {
  submit?: (request: ConsultationRequest) => Promise<void>;
}) {
  const [state, setState] = useState<'idle' | 'pending' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const minimumDate = useSyncExternalStore(
    subscribeToDateChange,
    minimumPreferredDate,
    serverMinimumDate,
  );
  const intent = useRef<{ hash: string; id: string } | null>(null);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'pending') return;
    const form = new FormData(event.currentTarget);
    const field = (name: string) => {
      const value = form.get(name);
      return typeof value === 'string' ? value.trim() : '';
    };
    const fields = {
      displayName: field('displayName'),
      email: field('email'),
      phone: field('phone'),
      preferredDate: field('preferredDate') || null,
      expectedGuests: field('expectedGuests') ? Number(field('expectedGuests')) : null,
      message: field('message'),
    };
    if (fields.preferredDate !== null && fields.preferredDate < minimumPreferredDate()) {
      setError('Ngày tổ chức dự kiến phải từ ngày mốt trở đi (theo giờ Việt Nam).');
      return;
    }
    const hash = JSON.stringify(fields);
    if (intent.current?.hash !== hash) intent.current = { hash, id: crypto.randomUUID() };
    setState('pending');
    setError(null);
    try {
      await submit({ ...fields, submissionId: intent.current.id });
      setState('success');
    } catch (caught) {
      setState('idle');
      setError(
        caught instanceof ApiClientError && caught.status === 429
          ? 'Bạn đã gửi nhiều yêu cầu. Vui lòng chờ hoặc liên hệ nhà hàng.'
          : 'Chưa gửi được yêu cầu. Nội dung của bạn vẫn được giữ lại; hãy thử lại.',
      );
    }
  }
  if (state === 'success')
    return (
      <section className="consultation-success" role="status">
        <span className="public-kicker">Đã tiếp nhận</span>
        <h2>Cảm ơn bạn đã mở lời.</h2>
        <p>
          Nhà hàng sẽ xem lại mong muốn của bạn và liên hệ qua thông tin đã cung cấp. Khi hồ sơ tư
          vấn được mở, bạn sẽ nhận lời mời vào không gian riêng.
        </p>
        <Link className="public-button" href="/halls">
          Khám phá không gian tiệc
        </Link>
      </section>
    );
  return (
    <form className="consultation-form" onSubmit={(event) => void send(event)}>
      <div className="public-form-grid">
        <label>
          Họ và tên
          <input name="displayName" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" required type="email" maxLength={320} autoComplete="email" />
        </label>
        <label>
          Số điện thoại <span>(không bắt buộc)</span>
          <input
            name="phone"
            type="tel"
            maxLength={30}
            autoComplete="tel"
            pattern="[+0-9 .\(\)\-]*"
          />
        </label>
        <label>
          Ngày tổ chức dự kiến <span>(không bắt buộc)</span>
          <input
            name="preferredDate"
            type="date"
            min={minimumDate}
            aria-describedby="preferred-date-help"
          />
          <span id="preferred-date-help">Chọn ngày mốt hoặc muộn hơn (theo giờ Việt Nam).</span>
        </label>
        <label>
          Số khách dự kiến <span>(không bắt buộc)</span>
          <input name="expectedGuests" type="number" min={1} max={10000} />
        </label>
      </div>
      <label>
        Điều bạn mong muốn <span>(không bắt buộc)</span>
        <textarea
          name="message"
          maxLength={2000}
          rows={4}
          placeholder="Không gian, thực đơn hoặc điều bạn muốn trao đổi cùng nhà hàng…"
        />
      </label>
      <p className="public-muted">
        Thông tin được dùng để tiếp nhận và liên hệ tư vấn. Gửi yêu cầu chưa giữ chỗ hay xác nhận
        đặt tiệc.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <button className="public-button" type="submit" disabled={state === 'pending'}>
        {state === 'pending' ? 'Đang gửi…' : 'Gửi lời hẹn tư vấn'} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
