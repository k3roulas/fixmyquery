export default function ScreenshotPlaceholder({
  caption,
  className = '',
}: {
  caption: string;
  className?: string;
}) {
  return (
    <div
      className={`flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-6 text-center ${className}`}
    >
      <span className="font-mono text-xs text-zinc-600">screenshot goes here</span>
      <span className="text-sm text-zinc-500">{caption}</span>
    </div>
  );
}
