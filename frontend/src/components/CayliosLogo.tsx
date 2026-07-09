type CayliosLogoVariant = 'full' | 'mark';

type CayliosLogoProps = {
  variant?: CayliosLogoVariant;
  className?: string;
  title?: string;
};

/**
 * Caylios platform brand slot rendering approved logo assets from the brand
 * kit (docs/caylios/brand-kit.md) exactly as exported — never composed,
 * recoloured, or rearranged. 'full' is the transparent full-colour lockup
 * (white wordmark: dark surfaces only). 'mark' is the transparent logo icon.
 * Workspace/client logos override this only in tenant-branded contexts.
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
        src="/brand/caylios-icon.png"
        alt={title}
      />
    );
  }

  return (
    <img
      className={className ? `caylios-brand-lockup ${className}` : 'caylios-brand-lockup'}
      src="/brand/caylios-lockup-dark-surface.png"
      alt={title}
    />
  );
}
