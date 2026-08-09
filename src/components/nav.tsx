import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/catalog", label: "Catalog" },
];

export default function Nav() {
  return (
    <header className="border-b border-[#e1e0d9] dark:border-[#2c2c2a]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight">
          TreasureHunt
        </Link>
        <nav className="flex gap-4 text-sm text-[#52514e] dark:text-[#c3c2b7]">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[#0b0b0b] dark:hover:text-[#ffffff] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
