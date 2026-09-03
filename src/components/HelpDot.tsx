'use client';

import { useId, useState } from 'react';

export default function HelpDot({
  text,
  anchor = 'center',
  side = 'top',
}: {
  text: string;
  anchor?: 'center' | 'right';
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const position = anchor === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  const vertical = side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2';
  return (
    <>
      <button
        type="button"
        aria-label={`Help: ${text}`}
        aria-describedby={id}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            // focus-within CSS would keep the tooltip pinned while the button stays focused
            e.currentTarget.blur();
          }
        }}
        className="ml-1 cursor-help text-zinc-600 hover:text-emerald-400"
      >
        ⓘ
      </button>
      <div
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute z-20 w-64 ${vertical} ${position} rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-left text-xs leading-relaxed text-zinc-300 shadow-xl ${
          open ? 'block' : 'hidden group-hover:block group-focus-within:block'
        }`}
      >
        {text}
      </div>
    </>
  );
}
