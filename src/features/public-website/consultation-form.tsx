'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { createPublicGateway, type ConsultationRequest, type Hall, type Menu } from './public-api';
import { minimumPreferredDate } from './consultation-date';
import { ApiClientError } from '../../lib/api/client';
import { browserSession } from '../identity-access/browser-session';
import { createExperienceGateway } from '../identity-access/experience-api';
import { DatePicker } from '../../design-system/date-picker';
import Link from 'next/link';

export type ContactPrefill = Readonly<{ displayName: string | null; email: string }>;

/**
 * Tên + email của couple đang đăng nhập (từ `/auth/profile`) để điền sẵn form.
 * Tài khoản quản lý/nhân viên có thể đang nhập hộ khách → không điền thông tin của chính họ.
 * Số điện thoại: API chưa trả về cho tài khoản nên không điền.
 */
async function loadSignedInContact(): Promise<ContactPrefill | null> {
  const snapshot = await browserSession.restore();
  if (snapshot.status !== 'authenticated') return null;
  if (snapshot.actor.roles.some((role) => role === 'MANAGER' || role === 'STAFF')) return null;
  const profile = await browserSession.authorize((token) =>
    createExperienceGateway().profile(token),
  );
  return { displayName: profile.displayName, email: profile.displayEmail };
}

function subscribeToDateChange(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener('focus', onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', onChange);
  };
}

const serverMinimumDate = () => '';

/** Lựa chọn mang sang từ công cụ ước tính / trang sảnh (query ?sanh=&thuc-don=&ngay=&khach=&ca=). */
export type ConsultationPrefill = Readonly<{
  date?: string | undefined;
  guests?: number | undefined;
  shift?: 'LUNCH' | 'DINNER' | undefined;
  hallId?: string | undefined;
  menuVersionId?: string | undefined;
  hallName?: string | undefined;
  menuName?: string | undefined;
}>;

/**
 * Giữ bản mô tả dễ đọc trong lời nhắn; các mã sảnh, phiên bản thực đơn và ca
 * được gửi bằng trường riêng để manager điền sẵn chính xác.
 */
export function choiceLines(prefill: ConsultationPrefill, shift: 'LUNCH' | 'DINNER' | ''): string {
  return [
    prefill.hallName ? `Sảnh quan tâm: ${prefill.hallName}` : '',
    prefill.menuName ? `Thực đơn quan tâm: ${prefill.menuName}` : '',
    shift ? `Ca mong muốn: ${shift === 'LUNCH' ? 'Ca trưa' : 'Ca tối'}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function ConsultationForm({
  submit = createPublicGateway().submit,
  prefill = {},
  onSent,
  loadContact = loadSignedInContact,
  halls = [],
  menus = [],
}: {
  halls?: readonly Hall[];
  menus?: readonly Menu[];
  submit?: (request: ConsultationRequest) => Promise<void>;
  prefill?: ConsultationPrefill;
  /** Gửi thành công → trang chuyển sang /tu-van/da-gui; không truyền thì hiện lời cảm ơn tại chỗ. */
  onSent?: () => void;
  /** Lấy tên/email để điền sẵn (mặc định: tài khoản couple đang đăng nhập). Tách prop để test. */
  loadContact?: () => Promise<ContactPrefill | null>;
}) {
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    loadContact()
      .then((contact) => {
        if (!active || contact === null) return;
        // Profile về sau khi form đã hiện: chỉ điền ô còn trống, không ghi đè chữ người dùng đã gõ.
        if (nameInput.current?.value === '' && contact.displayName)
          nameInput.current.value = contact.displayName;
        if (emailInput.current?.value === '') emailInput.current.value = contact.email;
      })
      .catch(() => {
        // Điền sẵn chỉ là tiện ích: lỗi thì để khách tự nhập.
      });
    return () => {
      active = false;
    };
  }, [loadContact]);
  const [hallId, setHallId] = useState(prefill.hallId ?? '');
  const [menuVersionId, setMenuVersionId] = useState(prefill.menuVersionId ?? '');
  const selectedHall = halls.find((item) => item.id === hallId);
  const selectedMenu = menus.find((item) => item.versionId === menuVersionId);
  const [shift, setShift] = useState<'LUNCH' | 'DINNER' | ''>(prefill.shift ?? '');
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
      preferredHallId: hallId || null,
      preferredMenuVersionId: menuVersionId || null,
      preferredShift: shift || null,
      message: [
        choiceLines({ hallName: selectedHall?.name, menuName: selectedMenu?.name }, shift),
        field('message'),
      ]
        .filter(Boolean)
        .join('\n\n'),
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
      onSent?.();
    } catch (caught) {
      setState('idle');
      setError(
        caught instanceof ApiClientError &&
          ['CONSULTATION_HALL_UNAVAILABLE', 'CONSULTATION_MENU_UNAVAILABLE'].includes(caught.code)
          ? 'Sảnh hoặc thực đơn vừa ngừng phục vụ. Vui lòng đổi lựa chọn rồi gửi lại.'
          : caught instanceof ApiClientError && caught.status === 429
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
        <Link className="public-button" href="/sanh">
          Khám phá không gian tiệc
        </Link>
      </section>
    );
  return (
    <form className="consultation-form" onSubmit={(event) => void send(event)}>
      {selectedHall || selectedMenu ? (
        <p className="hy-choice-summary">
          <span>Lựa chọn của bạn:</span>
          {selectedHall ? <span className="hy-chip">{selectedHall.name}</span> : null}
          {selectedMenu ? <span className="hy-chip">{selectedMenu.name}</span> : null}
          <span>Có thể đổi hoặc bỏ lựa chọn bên dưới.</span>
        </p>
      ) : null}
      <div className="public-form-grid">
        <label>
          Sảnh quan tâm (không bắt buộc)
          <select value={hallId} onChange={(event) => setHallId(event.target.value)}>
            <option value="">Chưa chọn sảnh · nhờ tư vấn</option>
            {halls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {hall.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Thực đơn quan tâm (không bắt buộc)
          <select value={menuVersionId} onChange={(event) => setMenuVersionId(event.target.value)}>
            <option value="">Chưa chọn thực đơn · nhờ tư vấn</option>
            {menus.map((menu) => (
              <option key={menu.versionId} value={menu.versionId}>
                {menu.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Họ và tên
          <input
            ref={nameInput}
            name="displayName"
            required
            maxLength={120}
            autoComplete="name"
            placeholder="Họ và tên"
          />
        </label>
        <label>
          Email
          <input
            ref={emailInput}
            name="email"
            required
            type="email"
            maxLength={320}
            autoComplete="email"
            placeholder="example@email.com"
          />
        </label>
        <label>
          Số điện thoại
          <input
            name="phone"
            type="tel"
            maxLength={30}
            autoComplete="tel"
            pattern="[+0-9 .\(\)\-]*"
            placeholder="Số điện thoại (không bắt buộc)"
          />
        </label>
        <label>
          Ngày tổ chức dự kiến
          <DatePicker
            name="preferredDate"
            min={minimumDate}
            defaultValue={prefill.date}
            placeholder="dd/mm/yyyy (không bắt buộc)"
            ariaDescribedby="preferred-date-help"
          />
          <span id="preferred-date-help">Chọn từ ngày mốt trở đi (theo giờ Việt Nam).</span>
        </label>
        <label>
          Số khách dự kiến
          <input
            name="expectedGuests"
            type="number"
            min={1}
            max={10000}
            defaultValue={prefill.guests}
            placeholder="Số lượng khách (không bắt buộc)"
          />
        </label>
        <fieldset className="hy-shift-picker">
          <legend>Ca mong muốn</legend>
          <div className="hy-shift-options">
            {(['LUNCH', 'DINNER'] as const).map((code) => (
              <label key={code} className={shift === code ? 'is-selected' : undefined}>
                <input
                  type="radio"
                  name="shift"
                  value={code}
                  checked={shift === code}
                  onChange={() => setShift(code)}
                />
                <strong>{code === 'LUNCH' ? 'Ca trưa' : 'Ca tối'}</strong>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="consultation-full-width">
          Điều bạn mong muốn
          <textarea
            name="message"
            maxLength={2000}
            rows={3}
            placeholder="Không gian, thực đơn hoặc điều bạn muốn trao đổi cùng nhà hàng… (không bắt buộc)"
          />
        </label>
      </div>
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
