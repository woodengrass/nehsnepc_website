const CALLOUT_LABELS = {
  note: 'NOTE',
  tip: 'TIP',
  warning: 'WARNING'
} as const;

type CalloutProps = {
  type?: keyof typeof CALLOUT_LABELS;
  title?: string;
  children: React.ReactNode;
};

export default function Callout({ type = 'note', title, children }: CalloutProps) {
  return (
    <aside
      className={`
        relative
        my-[2.3em]
        border
        border-[var(--color-line)]
        border-l-[6px]
        p-[1.4rem]
        ${type === 'warning'
          ? `
            border-l-[var(--color-red)]
            bg-[rgba(104,19,28,0.15)]
          `
          : `
            border-l-[var(--color-blue)]
            bg-[rgba(16,43,78,0.18)]
          `}
        [&>p:last-child]:mb-0
      `}
      data-type={type}
    >
      <p
        className={`
          mb-[0.7rem]
          text-[0.64rem]
          uppercase
          tracking-[0.14em]
          text-[var(--color-muted)]
        `}
      >
        {title ?? CALLOUT_LABELS[type]}
      </p>
      {children}
    </aside>
  );
}
