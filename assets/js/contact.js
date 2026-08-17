export function initContactPage() {
  const items = [...document.querySelectorAll('.accordion-item:not(#shootItem)')];
  const modal = document.getElementById('shootModal');
  const openButton = document.getElementById('shootTrigger');
  const closeButton = document.getElementById('shootModalClose');
  const backdrop = document.getElementById('shootModalBackdrop');
  const copyButton = document.getElementById('copyEmail');

  function closeItems() {
    items.forEach((item) => {
      item.classList.remove('open');
      item.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
      item.querySelector('.accordion-body').style.maxHeight = '';
    });
  }

  items.forEach((item) => {
    const trigger = item.querySelector('.accordion-trigger');
    const body = item.querySelector('.accordion-body');

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      closeItems();
      if (!isOpen) {
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        body.style.maxHeight = `${body.scrollHeight}px`;
      }
    });
  });

  function openModal() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('has-modal');
    closeButton.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-modal');
    openButton.focus();
  }

  openButton.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  copyButton?.addEventListener('click', async () => {
    const email = 'contact@nehsnepc.com';
    try {
      await navigator.clipboard.writeText(email);
      copyButton.textContent = 'copied';
      window.setTimeout(() => { copyButton.textContent = email; }, 1800);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  });
}
