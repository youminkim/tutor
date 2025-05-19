"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, History as HistoryIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Capture', icon: Camera },
  { href: '/history', label: 'History', icon: HistoryIcon },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-50 w-full border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 max-w-2xl items-center justify-around mx-auto px-0">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 p-2 rounded-md w-1/2 transition-colors",
                isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
