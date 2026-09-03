export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
    >
      <span aria-hidden="true" className="mt-0.5 text-red-400">
        ⚠
      </span>
      <p>{message}</p>
    </div>
  );
}
