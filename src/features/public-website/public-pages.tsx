'use client';
/* eslint-disable @next/next/no-img-element -- Catalog media use short-lived signed URLs and dynamic storage origins. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPublicGateway, type Hall, type Menu, type Restaurant } from './public-api';
import { PublicShell } from './public-shell';
import { ConsultationForm } from './consultation-form';

const gateway = createPublicGateway();
const vnd = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
type Section = 'home' | 'halls' | 'hall' | 'menus' | 'consultation';
export function PublicWebsite({
  section = 'home',
  hallId,
}: {
  section?: Section;
  hallId?: string;
}) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [halls, setHalls] = useState<readonly Hall[]>([]);
  const [menus, setMenus] = useState<readonly Menu[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const profile = await gateway.restaurant();
        if (!active) return;
        setRestaurant(profile);
        if (section === 'hall' && hallId) {
          const hall = await gateway.hall(hallId);
          if (active) setHalls([hall]);
        } else if (section === 'home' || section === 'halls') {
          const page = await gateway.halls();
          if (active) {
            setHalls(page.items);
            setCursor(page.nextCursor);
          }
        } else if (section === 'menus') {
          const page = await gateway.menus();
          if (active) {
            setMenus(page.items);
            setCursor(page.nextCursor);
          }
        }
        if (active) setError(null);
      } catch {
        if (active)
          setError('Chưa tải được thông tin nhà hàng. Bạn có thể thử lại hoặc gửi yêu cầu tư vấn.');
      } finally {
        if (active) setPending(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [section, hallId, retry]);
  async function more() {
    if (!cursor || pending) return;
    setPending(true);
    try {
      if (section === 'menus') {
        const page = await gateway.menus(cursor);
        setMenus((old) => [...old, ...page.items]);
        setCursor(page.nextCursor);
      } else {
        const page = await gateway.halls(cursor);
        setHalls((old) => [...old, ...page.items]);
        setCursor(page.nextCursor);
      }
      setError(null);
    } catch {
      setError('Chưa tải được phần tiếp theo. Hãy thử lại.');
    } finally {
      setPending(false);
    }
  }
  return (
    <PublicShell>
      {section === 'home' ? (
        <>
          <section className="public-hero">
            <div className="public-hero-copy">
              <span className="public-kicker">Một ngày đáng nhớ, một hành trình cùng nhau</span>
              <h1>
                Nơi lời hẹn
                <br />
                thành ngày chung đôi.
              </h1>
              <p>
                Chọn không gian bạn yêu, cùng hoàn thiện thực đơn và kịch bản. Mỗi bước chuẩn bị bắt
                đầu bằng một cuộc trò chuyện.
              </p>
              <Link className="public-button" href="/consultation">
                Cùng lên kế hoạch <span aria-hidden="true">↗</span>
              </Link>
              <Link className="public-text-link" href="/halls">
                Khám phá không gian tiệc →
              </Link>
            </div>
            <div className="public-hero-image">
              {restaurant?.media[0] ? (
                <img
                  src={restaurant.media[0].signedUrl}
                  alt={restaurant.media[0].alternativeText}
                />
              ) : (
                <div className="public-image-placeholder">
                  <span>WEDDING ESTATE</span>
                  <p>Một không gian dành cho câu chuyện của hai bạn</p>
                </div>
              )}
              <div className="public-image-caption">
                {restaurant?.displayName ?? 'Wedding Estate'}
                <span>Chạm đến ngày bạn mong đợi</span>
              </div>
            </div>
          </section>
          <section className="public-story">
            <p className="public-kicker">Chuẩn bị cùng nhau</p>
            <h2>
              Không chỉ là một buổi tiệc.
              <br />
              Là câu chuyện của hai bạn.
            </h2>
            <p>
              {restaurant?.description ||
                'Từ buổi tư vấn đầu tiên đến kịch bản ngày cưới, nhà hàng cùng bạn lựa chọn và thống nhất từng chi tiết.'}
            </p>
            <div className="public-steps">
              <p>
                <strong>01</strong> Chia sẻ mong muốn
              </p>
              <p>
                <strong>02</strong> Cùng duyệt kế hoạch
              </p>
              <p>
                <strong>03</strong> Sẵn sàng cho ngày chung đôi
              </p>
            </div>
          </section>
        </>
      ) : null}
      <section className="public-section">
        {section === 'home' || section === 'halls' ? (
          <>
            <div className="public-section-heading">
              <div>
                <span className="public-kicker">Không gian tiệc</span>
                <h2>
                  {section === 'home'
                    ? 'Một nơi cho mọi khoảnh khắc.'
                    : 'Chọn nơi câu chuyện bắt đầu.'}
                </h2>
              </div>
              {section === 'home' ? <Link href="/halls">Xem các sảnh tiệc →</Link> : null}
            </div>
            <div className="public-hall-grid">
              {halls.slice(0, section === 'home' ? 2 : undefined).map((hall) => (
                <HallCard key={hall.id} hall={hall} />
              ))}
            </div>
            {!pending && !error && halls.length === 0 ? (
              <p>Nhà hàng đang cập nhật các sảnh tiệc. Hãy liên hệ để được tư vấn.</p>
            ) : null}
          </>
        ) : null}
        {section === 'hall' && halls[0] ? (
          <>
            <Link href="/halls">← Các sảnh tiệc</Link>
            <h1>{halls[0].name}</h1>
            <div className="public-detail-grid">
              <div>
                {halls[0].media.map((media) => (
                  <img
                    key={media.id}
                    className="public-detail-image"
                    src={media.signedUrl}
                    alt={media.alternativeText}
                  />
                ))}
              </div>
              <div>
                <p>{halls[0].description}</p>
                <p className="public-capacity">
                  Sức chứa tối đa <strong>{halls[0].maxGuests} khách</strong>
                </p>
                <Link className="public-button" href="/consultation">
                  Trao đổi về sảnh tiệc →
                </Link>
              </div>
            </div>
          </>
        ) : null}
        {section === 'menus' ? (
          <>
            <span className="public-kicker">Thực đơn tiệc</span>
            <h1>Hương vị cho ngày sum vầy.</h1>
            <p className="public-lead">
              Giá theo bàn của thực đơn đang được nhà hàng công bố. Lựa chọn và giá cho tiệc của bạn
              sẽ được thống nhất trong hồ sơ tư vấn.
            </p>
            <div className="public-menu-list">
              {menus.map((menu) => (
                <article key={menu.id}>
                  <div>
                    <h2>{menu.name}</h2>
                    <p>{menu.description}</p>
                    <strong className="public-menu-price">
                      {vnd(menu.priceVndPerTable)} <small>/ bàn</small>
                    </strong>
                  </div>
                  <ol>
                    {menu.items.map((dish) => (
                      <li key={dish.dishVersionId}>
                        <strong>{dish.name}</strong>
                        {dish.description ? <p>{dish.description}</p> : null}
                      </li>
                    ))}
                  </ol>
                  <Link href="/consultation">Tư vấn thực đơn này →</Link>
                </article>
              ))}
            </div>
            {!pending && !error && menus.length === 0 ? (
              <p>Thực đơn đang được cập nhật. Nhà hàng sẵn sàng trao đổi về mong muốn của bạn.</p>
            ) : null}
          </>
        ) : null}
        {section === 'consultation' ? (
          <div className="public-consultation-layout">
            <div>
              <span className="public-kicker">Bắt đầu từ một cuộc trò chuyện</span>
              <h1>
                Kể chúng tôi nghe
                <br />
                ngày bạn mong muốn.
              </h1>
              <p>
                Để lại lời hẹn. Nhà hàng sẽ cùng bạn tìm không gian, thực đơn và cách chuẩn bị phù
                hợp.
              </p>
              <Contact restaurant={restaurant} />
            </div>
            <ConsultationForm />
          </div>
        ) : null}
        {pending ? (
          <p role="status" aria-live="polite">
            Đang cập nhật thông tin…
          </p>
        ) : null}
        {error ? (
          <div role="alert" className="public-data-error">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setPending(true);
                setRetry((old) => old + 1);
              }}
            >
              Thử lại
            </button>
          </div>
        ) : null}
        {cursor && section !== 'home' ? (
          <button
            className="public-button public-secondary"
            disabled={pending}
            onClick={() => void more()}
          >
            Xem thêm
          </button>
        ) : null}
      </section>
      {section === 'home' ? (
        <section className="public-invitation">
          <div>
            <span className="public-kicker">Những lựa chọn dành riêng cho bạn</span>
            <h2>
              Ngày đẹp nhất,
              <br />
              bắt đầu từ lời hẹn hôm nay.
            </h2>
            <p>
              Cùng nhà hàng tạo một kế hoạch rõ ràng, từ đề xuất đầu tiên đến những mốc cần thống
              nhất.
            </p>
            <Link className="public-button" href="/consultation">
              Hẹn một buổi tư vấn →
            </Link>
          </div>
          <Contact restaurant={restaurant} />
        </section>
      ) : null}
    </PublicShell>
  );
}
function HallCard({ hall }: { hall: Hall }) {
  return (
    <article className="public-hall-card">
      <Link className="public-hall-picture" href={`/halls/${hall.id}`}>
        {hall.media[0] ? (
          <img src={hall.media[0].signedUrl} alt={hall.media[0].alternativeText} />
        ) : (
          <div className="public-image-placeholder">
            <span>{hall.name}</span>
            <p>Ảnh sảnh đang được cập nhật</p>
          </div>
        )}
      </Link>
      <div className="public-hall-copy">
        <span className="public-muted">Tối đa {hall.maxGuests} khách</span>
        <h3>
          <Link href={`/halls/${hall.id}`}>{hall.name}</Link>
        </h3>
        <p>{hall.description}</p>
        <Link href={`/halls/${hall.id}`}>Khám phá sảnh →</Link>
      </div>
    </article>
  );
}
function Contact({ restaurant }: { restaurant: Restaurant | null }) {
  return (
    <address className="public-contact">
      <strong>{restaurant?.displayName ?? 'Wedding Estate'}</strong>
      {restaurant?.address ? <p>{restaurant.address}</p> : null}
      {restaurant?.publicPhone ? (
        <p>
          <a href={`tel:${restaurant.publicPhone.replace(/[^+\d]/gu, '')}`}>
            {restaurant.publicPhone}
          </a>
        </p>
      ) : null}
      {restaurant?.publicEmail ? (
        <p>
          <a href={`mailto:${restaurant.publicEmail}`}>{restaurant.publicEmail}</a>
        </p>
      ) : null}
      <Link href="/consultation">Gửi yêu cầu tư vấn →</Link>
    </address>
  );
}
