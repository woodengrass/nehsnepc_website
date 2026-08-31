import type { Metadata } from 'next';
import Link from 'next/link';

import { TOOLS } from '@/lib/tools';

export const metadata: Metadata = {
  title: 'Tools',
  description: 'NEHS 攝影社實用工具 — 曝光計算、景深試算、底片記錄等。',
  alternates: { canonical: '/tools' }
};

export default function ToolsPage() {
  return (
    <main className={`
      relative
      min-h-screen
      px-[var(--page-pad)]
      pt-[clamp(8.5rem,16vh,12rem)]
      pb-32
      max-[767px]:pt-30
      max-[767px]:pb-20
    `}>
      <span
        className={`
          pointer-events-none
          absolute
          top-[var(--header-height)]
          right-[var(--page-pad)]
          text-[clamp(11rem,24vw,25rem)]
          leading-[0.9]
          font-bold
          text-[rgba(240,238,232,0.035)]
          max-[767px]:hidden
        `}
        aria-hidden="true"
      >
        03
      </span>

      <header className={`
        relative
        grid
        min-h-[42vh]
        grid-cols-12
        border-y
        border-[var(--color-line)]
        max-[767px]:block
        max-[767px]:min-h-0
        max-[767px]:pb-8
      `}>
        <p className={`
          col-span-3
          self-start
          pt-4
          text-[0.68rem]
          tracking-[0.16em]
          text-[var(--color-muted)]
          uppercase
          max-[767px]:block
          max-[767px]:pt-[0.8rem]
        `}>
          NEHS NEPC / TOOLS
        </p>
        <h1 className={`
          col-start-4
          col-end-10
          self-center
          text-[clamp(4rem,9vw,9.5rem)]
          leading-[0.82]
          font-medium
          tracking-[-0.07em]
          max-[980px]:col-end-9
          max-[767px]:mt-18
          max-[767px]:text-[clamp(4rem,23vw,6.3rem)]
        `}>
          Tools
        </h1>
        <p className={`
          col-start-10
          col-end-13
          self-end
          border-l
          border-[var(--color-line)]
          pb-[1.4rem]
          pl-[1.4rem]
          text-[clamp(0.9rem,1.2vw,1.08rem)]
          leading-[1.8]
          text-[var(--color-muted)]
          max-[980px]:col-start-9
          max-[767px]:mt-10
          max-[767px]:border-t
          max-[767px]:border-l-0
          max-[767px]:pt-4
          max-[767px]:pb-0
          max-[767px]:pl-0
        `}>
          攝影的實用小工具，幫助你更有效率地試算與記錄。
        </p>
      </header>

      <div
        className={`
          mt-8
          flex
          justify-between
          border-y
          border-[var(--color-line)]
          py-[0.8rem]
          text-[0.62rem]
          tracking-[0.12em]
          text-[var(--color-muted)]
          uppercase
          max-[767px]:mt-[1.4rem]
        `}
        aria-label="工具使用說明"
      >
        <span>Utility index / 工具索引</span>
        <span>{String(TOOLS.length).padStart(2, '0')} modules</span>
        <span className={`
          max-[767px]:hidden
        `}>
          選擇卡片以查看工具狀態
        </span>
      </div>

      {TOOLS.length === 0 ? (
        <p className={`
          mt-16
          text-[var(--color-muted)]
        `}>
          第一個工具正在準備中。
        </p>
      ) : (
        <div className={`
          mt-20
          grid
          grid-cols-3
          border-t
          border-l
          border-[var(--color-line)]
          max-[980px]:grid-cols-2
          max-[767px]:mt-12
          max-[767px]:grid-cols-1
        `}>
          {TOOLS.map((tool, index) => {
            const card = (
              <article className={tool.href ? `
                relative
                grid
                min-h-full
                grid-rows-[auto_auto_1fr_auto]
                overflow-hidden
                p-4
                text-[var(--color-text)]
                transition-[background-color,color]
                duration-[260ms]
                ease-[cubic-bezier(0.22,1,0.36,1)]
                motion-reduce:transition-none
                group-hover:bg-[var(--color-paper)]
                group-hover:text-[var(--color-ink)]
              ` : `
                relative
                grid
                min-h-full
                grid-rows-[auto_auto_1fr_auto]
                overflow-hidden
                p-4
                text-[var(--color-text)]
                transition-[background-color,color]
                duration-[260ms]
                ease-[cubic-bezier(0.22,1,0.36,1)]
                motion-reduce:transition-none
              `}>
                <span className={`
                  absolute
                  top-4
                  right-4
                  z-[2]
                  min-w-[2.2rem]
                  bg-[var(--color-bg)]
                  px-[0.4rem]
                  py-[0.3rem]
                  text-center
                  text-[0.62rem]
                  tracking-[0.1em]
                  text-[var(--color-text)]
                `}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className={`
                  relative
                  -mx-4
                  -mt-4
                  mb-6
                  aspect-[4/3]
                  overflow-hidden
                  bg-[var(--color-surface)]
                `}>
                  <img
                    className={`
                      h-[108%]
                      w-[108%]
                      max-w-none
                      -translate-x-[3%]
                      -translate-y-[3%]
                      object-cover
                      grayscale
                      contrast-[1.12]
                      brightness-[0.72]
                      transition-[filter,transform]
                      duration-700
                      ease-[cubic-bezier(0.22,1,0.36,1)]
                      motion-reduce:transition-none
                      group-hover:translate-x-0
                      group-hover:grayscale-[0.15]
                      group-hover:contrast-[1.05]
                      group-hover:brightness-[0.85]
                    `}
                    src={tool.image}
                    alt={tool.imageAlt}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className={`
                    absolute
                    inset-0
                    bg-[linear-gradient(135deg,transparent_0_66%,rgba(104,19,28,0.6)_66%_77%,rgba(16,43,78,0.7)_77%)]
                    opacity-55
                    mix-blend-multiply
                    transition-opacity
                    duration-[260ms]
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    motion-reduce:transition-none
                    group-hover:opacity-18
                  `} aria-hidden="true" />
                </div>
                <h2 className={`
                  mb-3
                  text-[clamp(1.35rem,2vw,1.8rem)]
                  leading-[1.35]
                  font-semibold
                `}>
                  {tool.title}
                </h2>
                <p className={tool.href ? `
                  max-w-[34em]
                  text-[0.92rem]
                  leading-[1.85]
                  text-[var(--color-muted)]
                  transition-colors
                  duration-[260ms]
                  ease-[cubic-bezier(0.22,1,0.36,1)]
                  motion-reduce:transition-none
                  group-hover:text-[rgba(17,17,17,0.66)]
                ` : `
                  max-w-[34em]
                  text-[0.92rem]
                  leading-[1.85]
                  text-[var(--color-muted)]
                  transition-colors
                  duration-[260ms]
                  ease-[cubic-bezier(0.22,1,0.36,1)]
                  motion-reduce:transition-none
                `}>
                  {tool.description}
                </p>
                <span className={`
                  mt-8
                  flex
                  justify-between
                  border-t
                  border-current
                  pt-[0.85rem]
                  text-[0.65rem]
                  tracking-[0.15em]
                  uppercase
                  opacity-60
                `}>
                  <span>{tool.href ? '開啟' : '建置中'} {tool.href && <b className={`
                    font-normal
                  `} aria-hidden="true">→</b>}</span>
                  <span>{tool.href ? 'Open' : 'In progress'}</span>
                </span>
              </article>
            );
            return tool.href ? (
              <Link
                key={tool.id}
                href={tool.href}
                className={`
                  group
                  min-w-0
                  border-r
                  border-b
                  border-[var(--color-line)]
                `}
              >
                {card}
              </Link>
            ) : (
              <div key={tool.id} className={`
                group
                min-w-0
                border-r
                border-b
                border-[var(--color-line)]
              `}>
                {card}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
