import type { ReactNode } from 'react';
import type { DishKind } from './dishKind';

const shapes: Record<DishKind, ReactNode> = {
  dumplings: (
    <>
      <path d="M3 15c0-5 4-8 9-8s9 3 9 8c-3 1.5-6 2-9 2s-6-.5-9-2z" />
      <path d="M8 8.5l.8 2.5M12 7.5v2.8M16 8.5l-.8 2.5" />
    </>
  ),
  noodles: (
    <>
      <path d="M3 11h18a9 9 0 0 1-18 0z" />
      <path d="M14.5 2.5 19 10M17.5 2.5 21.5 9.5" />
      <path d="M7 14c1.5 1 3 1 4.5 0s3-1 4.5 0" />
    </>
  ),
  tofu: (
    <>
      <path d="M3 11h18a9 9 0 0 1-18 0z" />
      <rect x="7" y="5.5" width="4" height="4" rx="1" />
      <rect x="13" y="4.5" width="4" height="4" rx="1" />
    </>
  ),
  dimsum: (
    <>
      <ellipse cx="12" cy="8" rx="9" ry="3" />
      <path d="M3 8v7c0 1.7 4 3 9 3s9-1.3 9-3V8" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </>
  ),
  soup: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 5c-3 3 3 13 0 16" />
      <path d="M2 13h2M20 13h2" />
    </>
  ),
  rice: (
    <>
      <path d="M3 12h18a9 9 0 0 1-18 0z" />
      <path d="M6 12c0-3.5 2.7-6 6-6s6 2.5 6 6" />
    </>
  ),
  wonton: (
    <>
      <path d="M12 4c2 3 6 4 7 8-1 4-5 6-7 6s-6-2-7-6c1-4 5-5 7-8z" />
      <path d="M9 10c1 1 5 1 6 0" />
    </>
  ),
};

type DishArtProps = {
  kind: DishKind;
  className?: string;
  iconSize?: number;
  children?: ReactNode;
};

// DishArt is a placeholder image for a dish or restaurant: a muted color block with a
// line-drawn dish icon. Children (e.g. a status pill) are overlaid on the block.
export function DishArt({ kind, className = '', iconSize = 44, children }: DishArtProps) {
  return (
    <div className={`dish-art dish-art--${kind} ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {shapes[kind]}
      </svg>
      {children}
    </div>
  );
}
