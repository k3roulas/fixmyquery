export default function FeatureCard({
  glyph,
  title,
  description,
}: {
  glyph: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden="true" className="font-mono text-xs text-emerald-400">
          {glyph}
        </span>
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
    </div>
  );
}
