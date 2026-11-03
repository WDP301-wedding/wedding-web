import Link from 'next/link';
import { buttonVariants } from '../../components/ui/button';
import type { Task } from './overview-tasks';

export function OverviewNextSteps({ tasks }: Readonly<{ tasks: readonly Task[] }>) {
  if (!tasks.length) return null;
  const visible = tasks.slice(0, 2);
  const remaining = tasks.slice(visible.length);
  const row = (task: Task) => (
    <li
      key={task.title}
      className="flex min-w-0 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5"
    >
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold leading-relaxed">{task.title}</h4>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{task.detail}</p>
      </div>
      {task.href ? (
        <Link
          href={task.href}
          className={buttonVariants({
            variant: task.status === 'wait' ? 'default' : 'outline',
            size: 'sm',
            className: 'shrink-0 self-start sm:self-center',
          })}
        >
          {task.action}
        </Link>
      ) : null}
    </li>
  );
  return (
    <section className="border-t border-border pt-4" aria-labelledby="next-steps-title">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="next-steps-title" className="text-sm font-semibold">
          Bước tiếp theo
        </h3>
        <span className="text-xs text-muted-foreground">{tasks.length} mục</span>
      </div>
      <ul className="divide-y divide-border">{visible.map(row)}</ul>
      {remaining.length ? (
        <details className="group border-t border-border pt-3">
          <summary className="w-fit cursor-pointer rounded text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Xem thêm {remaining.length} việc
          </summary>
          <ul className="mt-1 divide-y divide-border">{remaining.map(row)}</ul>
        </details>
      ) : null}
    </section>
  );
}
