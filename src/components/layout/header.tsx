import { BookOpenCheck } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 max-w-2xl items-center justify-center mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <BookOpenCheck className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">ExamAce</span>
        </Link>
      </div>
    </header>
  );
}
