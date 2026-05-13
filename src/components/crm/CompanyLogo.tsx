import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';

interface Props {
  website: string | null;
  name: string;
  size?: number;
}

function domainFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function CompanyLogo({ website, name, size = 16 }: Props) {
  const [failed, setFailed] = useState(false);
  const domain = website ? domainFromUrl(website) : null;

  if (!domain || failed) {
    return (
      <div
        className={cn('flex-shrink-0 rounded bg-muted flex items-center justify-center')}
        style={{ width: size, height: size }}
      >
        <Building2 size={Math.round(size * 0.6)} className="text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="flex-shrink-0 rounded"
      onError={() => setFailed(true)}
    />
  );
}
