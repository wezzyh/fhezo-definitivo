import Link from "next/link";
import { Nav } from "./nav";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-blue-900">
          FHEZO Industrial
        </Link>
        <Nav />
      </div>
    </header>
  );
}
