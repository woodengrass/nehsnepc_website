import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '找不到頁面'
};

const LINKS = [
  { href: '/', label: '回到首頁', english: 'Home' },
  { href: '/tutorial', label: '攝影教學', english: 'Tutorial' }
] as const;

export default function NotFound() {
  return (
    <main className={`
      relative
      min-h-screen
      [padding:calc(var(--header-height)_+_0.5rem)_var(--page-pad)_8rem]
      max-[767px]:[padding-bottom:5rem]
    `}>
      <header className={`
        relative
        grid
        min-h-[43vh]
        grid-cols-12
        border-y
        border-[var(--color-line)]
        max-[767px]:block
        max-[767px]:min-h-0
      `}>
        <div className={`
          col-[1/9]
          flex
          flex-col
          justify-between
          border-r
          border-[var(--color-line)]
          p-[1rem_1rem_1.2rem_0]
          max-[980px]:col-[1/8]
          max-[767px]:min-h-[15rem]
          max-[767px]:border-r-0
          max-[767px]:border-b
          max-[767px]:p-[0.8rem_0_1.2rem]
        `}>
          <p className={`
            text-[0.64rem]
            uppercase
            tracking-[0.14em]
            text-[var(--color-muted)]
          `}>
            NEHS NEPC / 404
          </p>
          <h1 className={`
            text-[clamp(4rem,9vw,9.5rem)]
            font-semibold
            leading-[0.85]
            tracking-[-0.075em]
            max-[767px]:text-[clamp(3.8rem,21vw,6.2rem)]
          `}>
            Out of focus
          </h1>
        </div>
        <div className={`
          col-[9/13]
          flex
          flex-col
          justify-end
          p-[1.2rem_0_1.2rem_1.4rem]
          max-[980px]:col-[8/13]
          max-[767px]:p-[1.2rem_0]
        `}>
          <p className={`
            max-w-[28rem]
            text-[clamp(0.95rem,1.3vw,1.12rem)]
            leading-[1.85]
            text-[rgba(10,10,10,0.78)]
          `}>
            找不到這個頁面。網址可能打錯了，或頁面已經移除。
          </p>
          <strong className={`
            mt-8
            text-[0.64rem]
            font-normal
            uppercase
            tracking-[0.14em]
            text-[var(--color-red)]
            max-[767px]:mt-6
          `}>
            Error 404
          </strong>
        </div>
      </header>

      <nav className="border-b border-[var(--color-line)]" aria-label="頁面導覽">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`
              flex
              items-baseline
              justify-between
              gap-6
              border-b
              border-[var(--color-line-soft)]
              py-6
              text-[clamp(1.6rem,3vw,2.4rem)]
              transition-colors
              duration-[var(--transition-fast)]
              last:border-b-0
              hover:text-[var(--color-red)]
            `}
          >
            <span>{link.label}</span>
            <span className={`
              text-[0.64rem]
              uppercase
              tracking-[0.14em]
              text-[var(--color-muted)]
            `}>
              {link.english} →
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
