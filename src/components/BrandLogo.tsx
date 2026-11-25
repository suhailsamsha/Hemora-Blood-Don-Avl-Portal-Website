import { useState } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BrandLogo({ size = 'md', className = '' }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  const dims =
    size === 'sm'
      ? 'h-8 w-8'
      : size === 'lg'
        ? 'h-12 w-12'
        : 'h-9 w-9';

  if (failed) {
    return (
      <span
        className={`${dims} inline-flex items-center justify-center rounded-md border border-[#E2DDD6] dark:border-[#38322E] bg-[#FBEAE8] dark:bg-[#3A1513] shrink-0 ${className}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 36 36" className="h-5/6 w-5/6" fill="none">
          <path
            d="M18 4C18 4 8 15.2 8 22C8 27.5228 12.4772 32 18 32C23.5228 32 28 27.5228 28 22C28 15.2 18 4 18 4Z"
            fill="#B3261E"
          />
          <path
            d="M16.5 16H19.5V20.5H24V23.5H19.5V28H16.5V23.5H12V20.5H16.5V16Z"
            fill="#FFFFFF"
          />
        </svg>
      </span>
    );
  }

  return (
    <img
      src="/src/assets/images/blood_portal_logo_1795144844942.jpg"
      alt="Blood Donation Portal logo"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${dims} rounded-md object-cover border border-[#E2DDD6] dark:border-[#38322E] bg-white shrink-0 ${className}`}
    />
  );
}
