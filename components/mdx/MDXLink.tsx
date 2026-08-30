import Link from 'next/link';

export default function MDXLink({ href = '', children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
    return (
      <a
        className={`
          border-b
          border-[rgba(10,10,10,0.48)]
          transition-[color,border-color]
          duration-[var(--transition-fast)]
          hover:border-white
          hover:text-white
        `}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      className={`
        border-b
        border-[rgba(10,10,10,0.48)]
        transition-[color,border-color]
        duration-[var(--transition-fast)]
        hover:border-white
        hover:text-white
      `}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
