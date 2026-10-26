export default function PulseSkeleton({
  className = "h-3 w-10",
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded bg-zinc-800 animate-pulse ${className}`}
      aria-hidden
    />
  );
}
