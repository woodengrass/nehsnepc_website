import type { Metadata } from 'next';

import ContactPage from '@/components/contact/ContactPage';

export const metadata: Metadata = {
  title: 'Contact',
  description: '聯絡 NEHS 攝影社 — 誠摯邀請各社各校與我們合辦活動／委託拍攝。',
  alternates: { canonical: '/contact' }
};

export default function Contact() {
  return <ContactPage />;
}
