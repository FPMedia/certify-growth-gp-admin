import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const LOGO_PATH = '/img/growth-predictor-logo-website.png';

interface BrandLogoProps {
  className?: string;
  height?: number;
  href?: string | null;
  priority?: boolean;
}

export function BrandLogo({ className, height = 32, href = '/', priority }: BrandLogoProps) {
  const image = (
    <Image
      src={LOGO_PATH}
      alt="Growth Predictor"
      width={Math.round(height * 4.8)}
      height={height}
      className={cn('w-auto object-contain', className)}
      style={{ height }}
      priority={priority}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {image}
      </Link>
    );
  }

  return image;
}
