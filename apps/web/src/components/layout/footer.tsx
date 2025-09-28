import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built with{' '}
          <Link
            href="https://nextjs.org"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Next.js
          </Link>{' '}
          and <span className="font-medium">ActFlow</span>. The source code is available on{' '}
          <Link
            href="https://github.com/joseph0926/actflow"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            GitHub
          </Link>
          .
        </p>
        <div className="flex items-center space-x-1">
          <p className="text-sm text-muted-foreground">© 2025 ActFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
