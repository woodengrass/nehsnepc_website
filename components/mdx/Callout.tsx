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
    <aside className="article-callout" data-type={type}>
      <p className="article-callout-label">{title ?? CALLOUT_LABELS[type]}</p>
      {children}
    </aside>
  );
}
