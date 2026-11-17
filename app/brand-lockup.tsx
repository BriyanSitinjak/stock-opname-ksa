import Image from "next/image";

export function BrandLockup({
  width = 192,
  height = 48,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <Image src="/brand/lockup-horizontal.png" alt="Stock Opname KSA" width={width} height={height} className={className} />
  );
}

export function BrandIcon({ size = 96, className }: { size?: number; className?: string }) {
  return <Image src="/brand/icon-512.png" alt="" width={size} height={size} className={className} />;
}
