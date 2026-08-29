'use client';

import { useEffect, useRef, useState } from 'react';

const EMAIL = 'contact@nehsnepc.com';
const TALLY_EMBED_URL = 'https://tally.so/embed/NpRGgl?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1';

type AccordionId = 'contact' | 'social';

export default function ContactPage() {
  const [openItem, setOpenItem] = useState<AccordionId | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasModalOpened, setHasModalOpened] = useState(false);
  const [emailLabel, setEmailLabel] = useState(EMAIL);
  const contactBodyRef = useRef<HTMLDivElement>(null);
  const socialBodyRef = useRef<HTMLDivElement>(null);
  const shootTriggerRef = useRef<HTMLButtonElement>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);

  const closeItems = () => setOpenItem(null);

  const toggleItem = (id: AccordionId) => {
    setOpenItem((current) => (current === id ? null : id));
  };

  const openModal = () => {
    setModalOpen(true);
    setHasModalOpened(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    shootTriggerRef.current?.focus();
  };

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
    document.body.classList.toggle('has-modal', modalOpen);
    if (modalOpen) modalCloseRef.current?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalOpen) closeModal();
    };
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.classList.remove('has-modal');
    };
  }, [modalOpen]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setEmailLabel('copied');
      window.setTimeout(() => setEmailLabel(EMAIL), 1800);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

  const renderAccordionBody = (id: AccordionId, children: React.ReactNode, bodyRef: React.RefObject<HTMLDivElement | null>) => (
    <div className="accordion-body" ref={bodyRef} id={`acc-${id}-body`} aria-hidden={openItem !== id}>
      <div className="accordion-content">{children}</div>
    </div>
  );

  return (
    <>
      <main className="contact-layout">
        <div className="contact-left">
          <header className="contact-header">
            <h1 className="contact-title">CONTACT</h1>
            <div className="contact-title-line" aria-hidden="true" />
            <p className="contact-subtitle">「誠摯邀請各社各校與我們合辦活動／委託拍攝」</p>
          </header>

          <div className="accordion">
            <div className={`accordion-item${openItem === 'contact' ? ' open' : ''}`}>
              <button
                className="accordion-trigger"
                aria-expanded={openItem === 'contact'}
                aria-controls="acc-contact-body"
                onClick={() => toggleItem('contact')}
              >
                <span className="accordion-label">聯絡</span>
                <span className="accordion-icon" aria-hidden="true">+</span>
              </button>
              {renderAccordionBody(
                'contact',
                <button id="copyEmail" className="email-copy-btn" onClick={copyEmail}>{emailLabel}</button>,
                contactBodyRef
              )}
            </div>

            <div className="accordion-item" id="shootItem">
              <button
                ref={shootTriggerRef}
                className="accordion-trigger"
                id="shootTrigger"
                aria-haspopup="dialog"
                onClick={openModal}
              >
                <span className="accordion-label">接拍</span>
                <span className="accordion-icon" aria-hidden="true">+</span>
              </button>
              <div className="accordion-body" aria-hidden="true" />
            </div>

            <div className={`accordion-item${openItem === 'social' ? ' open' : ''}`}>
              <button
                className="accordion-trigger"
                aria-expanded={openItem === 'social'}
                aria-controls="acc-social-body"
                onClick={() => toggleItem('social')}
              >
                <span className="accordion-label">社群</span>
                <span className="accordion-icon" aria-hidden="true">+</span>
              </button>
              {renderAccordionBody(
                'social',
                <a href="https://instagram.com/nehs_nepc" target="_blank" rel="noopener" className="social-link">@nehs_nepc</a>,
                socialBodyRef
              )}
            </div>
          </div>
        </div>

        <div className="contact-right" aria-hidden="true">
          <picture className="contact-picture">
            <source
              type="image/avif"
              srcSet="/images/generated/contact-480.avif 480w, /images/generated/contact-800.avif 800w, /images/generated/contact-1200.avif 1200w, /images/generated/contact-1600.avif 1600w"
              sizes="40vw"
            />
            <source
              type="image/webp"
              srcSet="/images/generated/contact-480.webp 480w, /images/generated/contact-800.webp 800w, /images/generated/contact-1200.webp 1200w, /images/generated/contact-1600.webp 1600w"
              sizes="40vw"
            />
            <img src="/images/generated/contact-800.webp" alt="" className="contact-photo" />
          </picture>
        </div>
      </main>

      <div
        className={`shoot-modal${modalOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="接拍申請表單"
        aria-hidden={!modalOpen}
      >
        <div className="shoot-modal-backdrop" onClick={closeModal} />
        <div className="shoot-modal-box">
          <button className="shoot-modal-close" ref={modalCloseRef} onClick={closeModal} aria-label="關閉表單">
            &times;
          </button>
          {hasModalOpened && (
            <iframe
              src={TALLY_EMBED_URL}
              width="100%"
              height="100%"
              frameBorder={0}
              title="接拍申請表單"
              style={{ background: 'transparent', flex: 1, minHeight: 0 }}
            />
          )}
        </div>
      </div>
    </>
  );
}
