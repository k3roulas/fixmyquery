import Image from 'next/image';

export default function Screenshot({
  src,
  alt,
  caption,
  width,
  height,
  className = '',
}: {
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
        <Image src={src} alt={alt} width={width} height={height} className="h-auto w-full" />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-center text-xs text-zinc-500">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
