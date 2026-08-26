import Link from "next/link";

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" }) {
  const mark = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";
  const text = size === "sm" ? "text-base" : "text-lg";

  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <span
        className={`flex ${mark} items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-2 font-bold text-white`}
      >
        P
      </span>
      <span className={`${text} font-semibold text-slate-900 dark:text-white`}>Pathly</span>
    </Link>
  );
}
