'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

const EMAIL = 'contact@nehsnepc.com';

const TallyModal = dynamic(() => import('./TallyModal'), { ssr: false });

type AccordionId = 'contact' | 'social';

export default function ContactPage() {
  const [openItem, setOpenItem] = useState<AccordionId | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [emailLabel, setEmailLabel] = useState(EMAIL);
  const contactBodyRef = useRef<HTMLDivElement>(null);
  const socialBodyRef = useRef<HTMLDivElement>(null);
  const shootTriggerRef = useRef<HTMLButtonElement>(null);
  const copyTimerRef = useRef<number | ReturnType<typeof setTimeout> | undefined>(undefined);

  const toggleItem = (id: AccordionId) => {
    setOpenItem((current) => (current === id ? null : id));
  };

  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    shootTriggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const bodies: Record<AccordionId, HTMLDivElement | null> = {
      contact: contactBodyRef.current,
      social: socialBodyRef.current
    };
    (Object.keys(bodies) as AccordionId[]).forEach((id) => {
      const body = bodies[id];
      if (!body) return;
      if (openItem === id) body.style.maxHeight = `${body.scrollHeight}px`;
      else body.style.maxHeight = '';
    });
  }, [openItem]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== undefined) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setEmailLabel('copied');
      copyTimerRef.current = window.setTimeout(() => setEmailLabel(EMAIL), 1800);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

  const renderAccordionBody = (id: AccordionId, children: React.ReactNode, bodyRef: React.RefObject<HTMLDivElement | null>) => (
    <div
      className={`
        max-h-0
        overflow-hidden
        bg-[rgba(10,10,10,0.04)]
        transition-[max-height]
        duration-450
        ease-in-out
        motion-reduce:transition-none
      `}
      ref={bodyRef}
      id={`acc-${id}-body`}
      aria-hidden={openItem !== id}
    >
      <div
        className={`
          pt-[1.2rem]
          pr-4
          pb-[1.4rem]
          pl-14
          opacity-0
          transition-opacity
          delay-80
          duration-[260ms]
          ease-[cubic-bezier(0.22,1,0.36,1)]
          group-data-[open=true]:opacity-100
          motion-reduce:transition-none
          max-[767px]:pl-10
        `}
      >
        {children}
      </div>
    </div>
  );

  return (
    <>
      <main
        data-contact-page
        className={`
          grid
          h-svh
          grid-cols-[58%_42%]
          bg-[var(--color-bg)]
          min-[768px]:max-[980px]:grid-cols-[64%_36%]
          max-[767px]:block
          max-[767px]:h-auto
          max-[767px]:min-h-svh
        `}
      >
        <div
          className={`
            relative
            z-2
            flex
            h-svh
            flex-col
            overflow-hidden
            border-r
            border-[var(--color-line)]
            px-[var(--page-pad)]
            pt-[clamp(3.5rem,7vh,5rem)]
            pb-8
            max-[767px]:block
            max-[767px]:h-auto
            max-[767px]:min-h-svh
            max-[767px]:w-full
            max-[767px]:overflow-visible
            max-[767px]:border-r-0
            max-[767px]:pt-[calc(var(--header-height)+0.5rem)]
            max-[767px]:pb-12
          `}
        >
          <header
            className={`
              relative
              border-t
              border-[var(--color-line)]
              pt-[0.8rem]
            `}
          >
            <p
              className={`
                text-[0.62rem]
                tracking-[0.14em]
                text-[var(--color-muted)]
                uppercase
              `}
            >
              NEHS NEPC / CONTACT
            </p>
            <h1
              className={`
                mt-[clamp(1.5rem,4vh,3.4rem)]
                text-[clamp(4.1rem,8.8vw,9.4rem)]
                leading-[0.82]
                font-semibold
                tracking-[-0.085em]
                min-[768px]:max-[980px]:text-[clamp(4rem,9vw,7rem)]
                max-[767px]:mt-[3.2rem]
                max-[767px]:text-[clamp(4rem,21vw,6rem)]
              `}
            >
              CONTACT
            </h1>
            <p
              className={`
                mt-6
                w-[min(38rem,75%)]
                text-[clamp(0.85rem,1.1vw,1rem)]
                leading-[1.8]
                text-[rgba(10,10,10,0.82)]
                min-[768px]:max-[980px]:w-[90%]
                max-[767px]:w-full
              `}
            >
              「誠摯邀請各社各校與我們合辦活動／委託拍攝」
            </p>
          </header>

          <div
            className={`
              mt-[clamp(1.5rem,4vh,3rem)]
              flex
              justify-between
              border-y
              border-[var(--color-line)]
              py-[0.8rem]
              text-[0.62rem]
              tracking-[0.14em]
              text-[var(--color-muted)]
              uppercase
              max-[767px]:mt-14
            `}
          >
            <span>Choose a channel / 選擇聯絡方式</span>
            <span
              className={`
                max-[980px]:hidden
              `}
            >
              點擊列項展開，接拍將開啟申請表
            </span>
          </div>

          <div
            className={`
              mt-auto
              flex-none
              max-[767px]:mt-10
            `}
          >
            <div
              className={`
                group
                border-b
                border-[var(--color-line)]
              `}
              data-open={openItem === 'contact'}
            >
              <button
                className={`
                  grid
                  min-h-[clamp(4.2rem,9vh,6rem)]
                  w-full
                  grid-cols-[2.5rem_1fr_auto]
                  items-center
                  text-left
                  transition-[padding,color,background]
                  duration-[260ms]
                  ease-[cubic-bezier(0.22,1,0.36,1)]
                  hover:bg-[var(--color-paper)]
                  hover:px-4
                  hover:text-[var(--color-ink)]
                  group-data-[open=true]:bg-[var(--color-paper)]
                  group-data-[open=true]:px-4
                  group-data-[open=true]:text-[var(--color-ink)]
                  motion-reduce:transition-none
                  max-[767px]:min-h-20
                `}
                aria-expanded={openItem === 'contact'}
                aria-controls="acc-contact-body"
                onClick={() => toggleItem('contact')}
              >
                <span
                  className={`
                    text-[0.62rem]
                    tracking-[0.14em]
                    uppercase
                    opacity-45
                  `}
                >
                  01
                </span>
                <span
                  className={`
                    flex
                    max-w-[80%]
                    items-baseline
                    justify-between
                    text-[clamp(1.4rem,2.4vw,2.2rem)]
                    font-semibold
                    tracking-[-0.03em]
                    max-[767px]:max-w-none
                    max-[767px]:text-[1.55rem]
                  `}
                >
                  聯絡
                  <small
                    className={`
                      text-[0.62rem]
                      font-normal
                      tracking-[0.14em]
                      uppercase
                      opacity-45
                      max-[767px]:hidden
                    `}
                  >
                    Email
                  </small>
                </span>
                <span
                  className={`
                    text-[1.4rem]
                    leading-none
                    font-normal
                    transition-transform
                    duration-[260ms]
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    group-data-[open=true]:rotate-45
                    motion-reduce:transition-none
                  `}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
              {renderAccordionBody(
                'contact',
                <button
                  id="copyEmail"
                  className={`
                    border-b
                    border-[var(--color-line)]
                    pb-[0.35rem]
                    text-[clamp(0.8rem,1.2vw,1rem)]
                    tracking-[0.08em]
                    text-[rgba(10,10,10,0.82)]
                    transition-[color,border-color]
                    duration-[260ms]
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    hover:border-[var(--color-text)]
                    hover:text-[var(--color-text)]
                    motion-reduce:transition-none
                  `}
                  onClick={copyEmail}
                >
                  {emailLabel}
                </button>,
                contactBodyRef
              )}
            </div>

            <div
              className={`
                border-b
                border-[var(--color-line)]
              `}
              id="shootItem"
            >
              <button
                ref={shootTriggerRef}
                className={`
                  grid
                  min-h-[clamp(4.2rem,9vh,6rem)]
                  w-full
                  grid-cols-[2.5rem_1fr_auto]
                  items-center
                  text-left
                  transition-[padding,color,background]
                  duration-[260ms]
                  ease-[cubic-bezier(0.22,1,0.36,1)]
                  hover:bg-[var(--color-paper)]
                  hover:px-4
                  hover:text-[var(--color-ink)]
                  motion-reduce:transition-none
                  max-[767px]:min-h-20
                `}
                id="shootTrigger"
                aria-haspopup="dialog"
                aria-expanded={modalOpen}
                onClick={openModal}
              >
                <span
                  className={`
                    text-[0.62rem]
                    tracking-[0.14em]
                    uppercase
                    opacity-45
                  `}
                >
                  02
                </span>
                <span
                  className={`
                    flex
                    max-w-[80%]
                    items-baseline
                    justify-between
                    text-[clamp(1.4rem,2.4vw,2.2rem)]
                    font-semibold
                    tracking-[-0.03em]
                    max-[767px]:max-w-none
                    max-[767px]:text-[1.55rem]
                  `}
                >
                  接拍
                  <small
                    className={`
                      text-[0.62rem]
                      font-normal
                      tracking-[0.14em]
                      uppercase
                      opacity-45
                      max-[767px]:hidden
                    `}
                  >
                    Request
                  </small>
                </span>
                <span
                  className={`
                    text-[1.4rem]
                    leading-none
                    font-normal
                  `}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
              <div
                className={`
                  max-h-0
                  overflow-hidden
                  bg-[rgba(10,10,10,0.04)]
                `}
                aria-hidden="true"
              />
            </div>

            <div
              className={`
                group
                border-b
                border-[var(--color-line)]
              `}
              data-open={openItem === 'social'}
            >
              <button
                className={`
                  grid
                  min-h-[clamp(4.2rem,9vh,6rem)]
                  w-full
                  grid-cols-[2.5rem_1fr_auto]
                  items-center
                  text-left
                  transition-[padding,color,background]
                  duration-[260ms]
                  ease-[cubic-bezier(0.22,1,0.36,1)]
                  hover:bg-[var(--color-paper)]
                  hover:px-4
                  hover:text-[var(--color-ink)]
                  group-data-[open=true]:bg-[var(--color-paper)]
                  group-data-[open=true]:px-4
                  group-data-[open=true]:text-[var(--color-ink)]
                  motion-reduce:transition-none
                  max-[767px]:min-h-20
                `}
                aria-expanded={openItem === 'social'}
                aria-controls="acc-social-body"
                onClick={() => toggleItem('social')}
              >
                <span
                  className={`
                    text-[0.62rem]
                    tracking-[0.14em]
                    uppercase
                    opacity-45
                  `}
                >
                  03
                </span>
                <span
                  className={`
                    flex
                    max-w-[80%]
                    items-baseline
                    justify-between
                    text-[clamp(1.4rem,2.4vw,2.2rem)]
                    font-semibold
                    tracking-[-0.03em]
                    max-[767px]:max-w-none
                    max-[767px]:text-[1.55rem]
                  `}
                >
                  社群
                  <small
                    className={`
                      text-[0.62rem]
                      font-normal
                      tracking-[0.14em]
                      uppercase
                      opacity-45
                      max-[767px]:hidden
                    `}
                  >
                    Social
                  </small>
                </span>
                <span
                  className={`
                    text-[1.4rem]
                    leading-none
                    font-normal
                    transition-transform
                    duration-[260ms]
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    group-data-[open=true]:rotate-45
                    motion-reduce:transition-none
                  `}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
              {renderAccordionBody(
                'social',
                <a
                  href="https://instagram.com/nehs_nepc"
                  target="_blank"
                  rel="noopener"
                  className={`
                    border-b
                    border-[var(--color-line)]
                    pb-[0.35rem]
                    text-[clamp(0.8rem,1.2vw,1rem)]
                    tracking-[0.08em]
                    text-[rgba(10,10,10,0.82)]
                    transition-[color,border-color]
                    duration-[260ms]
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    hover:border-[var(--color-text)]
                    hover:text-[var(--color-text)]
                    motion-reduce:transition-none
                  `}
                >
                  @nehs_nepc
                </a>,
                socialBodyRef
              )}
            </div>
          </div>
        </div>

        <div
          className={`
            relative
            h-svh
            overflow-hidden
            bg-[#101d2b]
            max-[767px]:h-[58svh]
            max-[767px]:w-full
            max-[767px]:border-t
            max-[767px]:border-[var(--color-line)]
          `}
          aria-hidden="true"
        >
          <picture
            className={`
              absolute
              top-[16%]
              right-0
              block
              h-[62%]
              w-[86%]
              overflow-hidden
              border-y
              border-l
              border-white/30
              max-[767px]:top-[12%]
              max-[767px]:h-[68%]
              max-[767px]:w-[88%]
            `}
          >
            <source
              type="image/avif"
              srcSet="/images/generated/contact-480.avif 480w, /images/generated/contact-800.avif 800w, /images/generated/contact-1200.avif 1200w, /images/generated/contact-1600.avif 1600w"
              sizes="(max-width: 767px) 88vw, 40vw"
            />
            <source
              type="image/webp"
              srcSet="/images/generated/contact-480.webp 480w, /images/generated/contact-800.webp 800w, /images/generated/contact-1200.webp 1200w, /images/generated/contact-1600.webp 1600w"
              sizes="(max-width: 767px) 88vw, 40vw"
            />
            <img
              src="/images/generated/contact-800.webp"
              alt=""
              className={`
                h-full
                w-full
                object-cover
                object-[58%_center]
                [filter:grayscale(0.42)_contrast(1.08)_brightness(0.78)]
              `}
            />
          </picture>
          <div
            className={`
              pointer-events-none
              absolute
              top-[30%]
              left-0
              z-2
              h-px
              w-[14%]
              bg-white/40
            `}
          />
        </div>
      </main>

      {modalOpen ? <TallyModal onClose={closeModal} /> : null}
    </>
  );
}
