import Link from 'next/link';

const HOME_LINKS = [
  {
    href: '/about',
    index: '01',
    title: 'About',
    localized: '關於我們',
    description: '了解我們社團，體驗精美的展示頁面與我們的用心'
  },
  {
    href: '/tutorial',
    index: '02',
    title: 'Tutorial',
    localized: '攝影教學',
    description: '公開的攝影教學，包含不同面向、深度的詳細教學文章'
  },
  {
    href: '/tools',
    index: '03',
    title: 'Tools',
    localized: '實用工具',
    description: '為輔助日常攝影設計的輕量化工具'
  },
  {
    href: '/contact',
    index: '04',
    title: 'Contact',
    localized: '與我們聯絡',
    description: '委託拍攝、合作或是其他聯絡我們的需求'
  }
] as const;

const FILM_FRAMES = [
  `
    h-full
    w-full
    object-cover
    object-[10%_60%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[34%_57%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[57%_62%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[78%_55%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[96%_60%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[10%_60%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[34%_57%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[57%_62%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[78%_55%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[96%_60%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[10%_60%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `,
  `
    h-full
    w-full
    object-cover
    object-[34%_57%]
    grayscale-[0.88]
    contrast-[1.12]
    brightness-[0.82]
  `
] as const;

export default function Hero() {
  return (
    <main className={`
      relative
      min-h-screen
      overflow-hidden
      bg-[var(--color-bg)]
    `}>
      <section
        className={`
          relative
          min-h-[max(760px,100svh)]
          overflow-hidden
          border-b
          border-[var(--color-line)]
          bg-[linear-gradient(90deg,transparent_calc(25%_-_1px),var(--color-line-soft)_25%,transparent_calc(25%_+_1px)),linear-gradient(90deg,transparent_calc(62%_-_1px),var(--color-line-soft)_62%,transparent_calc(62%_+_1px))]
          max-[767px]:min-h-[max(720px,100svh)]
          max-[767px]:bg-[linear-gradient(90deg,transparent_calc(72%_-_1px),var(--color-line-soft)_72%,transparent_calc(72%_+_1px))]
        `}
        aria-labelledby="home-title"
      >
        <span className={`
          pointer-events-none
          absolute
          top-[18%]
          left-[var(--page-pad)]
          z-0
          h-13
          w-13
          border-t
          border-l
          border-[var(--color-red)]
          max-[767px]:top-28
          max-[767px]:h-10
          max-[767px]:w-10
        `} aria-hidden="true" />
        <div className={`
          absolute
          top-[2.2rem]
          left-[35%]
          z-[2]
          font-[family-name:var(--font-body-next)]
          text-[0.58rem]
          tracking-[0.16em]
          text-[var(--color-muted)]
          uppercase
          max-[767px]:top-6
          max-[767px]:left-[var(--page-pad)]
        `} aria-hidden="true">
          N24°48′ / E120°58′
        </div>
        <div className={`
          absolute
          top-[45%]
          left-[1.2rem]
          z-[2]
          font-[family-name:var(--font-body-next)]
          text-[0.58rem]
          tracking-[0.16em]
          text-[var(--color-muted)]
          uppercase
          [writing-mode:vertical-rl]
          max-[767px]:hidden
        `} aria-hidden="true">
          FRAME 01—05
        </div>
        <div className={`
          absolute
          top-[20%]
          left-[9%]
          z-[1]
          whitespace-nowrap
          font-[family-name:var(--font-body-next)]
          text-[clamp(5.5rem,12vw,12rem)]
          leading-[0.8]
          font-bold
          tracking-[-0.06em]
          text-transparent
          [-webkit-text-stroke:1.5px_rgba(10,10,10,0.24)]
          max-[767px]:top-[18%]
          max-[767px]:left-2
          max-[767px]:whitespace-normal
          max-[767px]:text-[clamp(3.8rem,18vw,5.8rem)]
          max-[767px]:leading-[0.82]
          max-[767px]:tracking-[-0.1em]
          max-[767px]:[-webkit-text-stroke:1.25px_rgba(10,10,10,0.2)]
          max-[767px]:[text-orientation:mixed]
          max-[767px]:[writing-mode:vertical-rl]
        `} aria-hidden="true">
          EST. 2016
        </div>

        <div className={`
          absolute
          bottom-[clamp(4.75rem,10vh,8rem)]
          left-[var(--page-pad)]
          z-[3]
          border-l-4
          border-[var(--color-red)]
          py-5
          pl-6
          pr-8
          w-[min(61vw,960px)]
          max-[980px]:w-[68vw]
          max-[767px]:bottom-20
          max-[767px]:w-[calc(100%_-_(var(--page-pad)_*_2))]
          max-[767px]:py-4
          max-[767px]:pl-4
          max-[767px]:pr-3
        `}>
          <h1
            className={`
              relative
              flex
              flex-col
              items-start
              font-[family-name:var(--font-body-next)]
              text-[clamp(5.4rem,14.3vw,14rem)]
              leading-[0.67]
              font-bold
              tracking-[-0.09em]
              text-[var(--color-ink)]
              max-[767px]:w-full
              max-[767px]:text-[clamp(4.7rem,25vw,7.5rem)]
              max-[767px]:leading-[0.7]
            `}
            id="home-title"
          >
            <span>NEHS</span>
            <span className={`
              ml-[0.33em]
              text-[var(--color-bg)]
              [-webkit-text-stroke:2px_var(--color-ink)]
              max-[767px]:ml-[0.12em]
            `}>
              NEPC
            </span>
            <span className={`
              absolute
              -right-[5%]
              bottom-[-0.14em]
              -z-[1]
              h-[0.62em]
              w-[46%]
              bg-[var(--color-red)]
              max-[767px]:right-[2%]
              max-[767px]:w-[48%]
            `} aria-hidden="true" />
          </h1>
        </div>

        <div className={`
          pointer-events-none
          absolute
          -top-[5%]
          right-[calc(clamp(-4rem,-2vw,-1rem)_+_2.5rem)]
          z-[2]
          w-[clamp(16rem,25vw,27rem)]
          rotate-[3.5deg]
          bg-[#101010]
          px-[2.2rem]
          py-12
          text-[#ece9df]
          max-[980px]:right-[calc(-6rem_+_15px)]
          max-[980px]:w-96
          max-[767px]:top-[8%]
          max-[767px]:right-[calc(-5.5rem_+_15px)]
          max-[767px]:w-68
          max-[767px]:rotate-7
          max-[767px]:px-[1.7rem]
          max-[767px]:py-[2.4rem]
        `} aria-hidden="true">
          <span className={`
            absolute
            inset-y-0
            left-[0.55rem]
            w-[1.1rem]
            bg-[repeating-linear-gradient(180deg,transparent_0_1.25rem,var(--color-bg)_1.25rem_2rem,transparent_2rem_3.25rem)]
            max-[767px]:left-[0.35rem]
            max-[767px]:w-[0.8rem]
          `} />
          <span className={`
            absolute
            inset-y-0
            right-[0.55rem]
            w-[1.1rem]
            bg-[repeating-linear-gradient(180deg,transparent_0_1.25rem,var(--color-bg)_1.25rem_2rem,transparent_2rem_3.25rem)]
            max-[767px]:right-[0.35rem]
            max-[767px]:w-[0.8rem]
          `} />
          <span className={`
            absolute
            top-[1.05rem]
            left-[2.2rem]
            z-[2]
            font-[family-name:var(--font-body-next)]
            text-[0.48rem]
            tracking-[0.17em]
            max-[767px]:left-[1.7rem]
          `}>
            NEPC · 400
          </span>
          <div className={`
            grid
            gap-[0.6rem]
            max-[767px]:gap-[0.4rem]
          `}>
            {FILM_FRAMES.map((position, index) => (
              <picture
                className={index === 2 ? `
                  relative
                  block
                  translate-x-[3px]
                  rotate-[0.7deg]
                  aspect-[3/2]
                  overflow-hidden
                  border
                  border-white/40
                  bg-[#272727]
                  shadow-[0.35rem_0.35rem_0_rgba(0,0,0,0.28)]
                  ${index >= 2 ? 'max-[767px]:hidden film-short:hidden' : ''}
                  ${index >= 3 ? 'film-phone:hidden' : ''}
                  ${index >= 6 ? 'film-medium:hidden' : ''}
                  ${index >= 8 ? 'film-tall:hidden' : ''}
                ` : `
                  relative
                  block
                  aspect-[3/2]
                  overflow-hidden
                  border
                  border-white/40
                  bg-[#272727]
                  ${index >= 2 ? 'max-[767px]:hidden film-short:hidden' : ''}
                  ${index >= 3 ? 'film-phone:hidden' : ''}
                  ${index >= 6 ? 'film-medium:hidden' : ''}
                  ${index >= 8 ? 'film-tall:hidden' : ''}
                `}
                key={`${position}-${index}`}
              >
                <source
                  type="image/avif"
                  srcSet="/images/generated/hero-640.avif 640w, /images/generated/hero-1280.avif 1280w"
                  sizes="(max-width: 767px) 45vw, 18vw"
                />
                <img className={position} src="/images/generated/hero-1280.webp" alt="" />
              </picture>
            ))}
          </div>
          <span className={`
            absolute
            right-[0.65rem]
            bottom-4
            z-[2]
            font-[family-name:var(--font-body-next)]
            text-[0.48rem]
            leading-[2]
            tracking-[0.17em]
            [writing-mode:vertical-rl]
          `}>
            01A<br />05A
          </span>
        </div>

        <a className={`
          absolute
          left-[var(--page-pad)]
          bottom-8
          z-[10]
          flex
          w-[clamp(8rem,12vw,12rem)]
          justify-between
          gap-6
          border-t
          border-[#101d2b]
          bg-[#101d2b]
          px-3
          py-2
          font-[family-name:var(--font-body-next)]
          text-[0.62rem]
          tracking-[0.12em]
          text-[var(--color-paper)]
          uppercase
          shadow-[0.3rem_0.3rem_0_rgba(10,10,10,0.08)]
          transition-colors
          hover:border-[var(--color-red)]
          hover:bg-[var(--color-red)]
          hover:text-[var(--color-ink)]
          motion-reduce:transition-none
          max-[767px]:bottom-[1.2rem]
          max-[767px]:w-28
          max-[767px]:text-[0.52rem]
        `} href="#home-index">
          <span>Explore index</span>
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section
        className={`
          relative
          bg-[#101d2b]
          px-[var(--page-pad)]
          pt-[clamp(7rem,13vw,13rem)]
          pb-8
          text-[var(--color-paper)]
          max-[767px]:pt-26
          max-[767px]:pb-[1.2rem]
        `}
        id="home-index"
        aria-label="網站內容索引"
      >
        <span className={`
          absolute
          top-0
          right-[18%]
          h-[clamp(1.2rem,2vw,2rem)]
          w-[18%]
          bg-[var(--color-red)]
          max-[767px]:right-[12%]
          max-[767px]:w-[28%]
        `} aria-hidden="true" />
        <header className={`
          mb-[clamp(7rem,12vw,12rem)]
          grid
          grid-cols-[2fr_7fr_3fr]
          items-start
          gap-4
          max-[980px]:grid-cols-[2fr_7fr]
          max-[767px]:mb-24
          max-[767px]:block
        `}>
          <p className={`
            font-[family-name:var(--font-body-next)]
            text-[0.62rem]
            leading-[1.7]
            tracking-[0.12em]
            uppercase
            opacity-62
          `}>
            Club 2026
          </p>
        </header>

        <nav className={`
          border-t
          border-[rgba(248,247,244,0.35)]
        `} aria-label="網站主要內容">
          {HOME_LINKS.map((item) => (
            <Link className={`
              grid
              min-h-[clamp(9rem,13vw,13rem)]
              grid-cols-[1fr_5fr_3fr_0.6fr]
              items-center
              gap-4
              border-b
              border-[rgba(248,247,244,0.35)]
              transition-[color,background-color,padding]
              duration-[260ms]
              ease-[cubic-bezier(0.22,1,0.36,1)]
              motion-reduce:transition-none
              hover:bg-[var(--color-red)]
              hover:px-4
              hover:text-[var(--color-ink)]
              max-[980px]:grid-cols-[0.8fr_5fr_3fr_0.5fr]
              max-[767px]:min-h-34
              max-[767px]:grid-cols-[2rem_1fr_2rem]
              max-[767px]:gap-2
            `} href={item.href} key={item.href}>
              <span className={`
                self-start
                pt-4
                font-[family-name:var(--font-body-next)]
                text-[0.62rem]
                tracking-[0.12em]
                opacity-62
                max-[767px]:col-start-1
              `}>
                {item.index}
              </span>
              <span className={`
                font-[family-name:var(--font-heading-next)]
                text-[clamp(3.5rem,8vw,8.5rem)]
                leading-[0.85]
                tracking-[-0.055em]
                max-[767px]:col-start-2
                max-[767px]:text-[clamp(3.4rem,18vw,5.4rem)]
              `}>
                {item.title}
              </span>
              <span className={`
                flex
                max-w-96
                flex-col
                gap-[0.8rem]
                text-[0.9rem]
                leading-[1.8]
                max-[767px]:hidden
              `}>
                <b className={`
                  font-medium
                  tracking-[0.08em]
                `}>
                  {item.localized}
                </b>
                <span className={`
                  opacity-62
                `}>
                  {item.description}
                </span>
              </span>
              <span className={`
                justify-self-end
                font-[family-name:var(--font-body-next)]
                text-[clamp(1.3rem,2.4vw,2.5rem)]
                font-light
                max-[767px]:col-start-3
                max-[767px]:text-[1.2rem]
              `} aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </nav>

        <footer className={`
          mt-[clamp(6rem,10vw,10rem)]
          flex
          justify-between
          border-t
          border-[rgba(248,247,244,0.35)]
          pt-4
          font-[family-name:var(--font-body-next)]
          text-[0.58rem]
          tracking-[0.12em]
          uppercase
          opacity-62
          max-[767px]:mt-24
          max-[767px]:leading-[1.5]
        `}>
          <span>© 2026 NEHS NEPC. All rights reserved.</span>
          <span className={`
            flex
            gap-6
          `}>
            <Link
              href="/licensing"
              className={`
                underline
                underline-offset-4
              `}
            >
              授權 Licensing
            </Link>
            <span className={`
              max-[767px]:hidden
            `}>
              Hsinchu, Taiwan
            </span>
          </span>
        </footer>
      </section>
    </main>
  );
}
