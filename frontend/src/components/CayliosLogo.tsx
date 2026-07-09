type CayliosLogoVariant = 'full' | 'mark';

type CayliosLogoProps = {
  variant?: CayliosLogoVariant;
  className?: string;
  title?: string;
};

/**
 * Caylios platform brand slot rendering approved logo assets from the brand
 * kit (docs/caylios/brand-kit.md). The lockup carries a white wordmark, so
 * both variants expect dark platform surfaces. Workspace/client logos should
 * override this only in tenant-branded contexts.
 */
export default function CayliosLogo({
  variant = 'full',
  className,
  title = 'Caylios',
}: CayliosLogoProps) {
  if (variant === 'mark') {
    return (
      <img
        className={className ? `caylios-brand-mark ${className}` : 'caylios-brand-mark'}
        src="/brand/caylios-logo-icon-transparent.png"
        alt={title}
      />
    );
  }

  return (
    <img
      className={className ? `caylios-brand-lockup ${className}` : 'caylios-brand-lockup'}
      src="/brand/caylios-logo-primary-transparent.png"
      alt={title}
    />
  );
}
