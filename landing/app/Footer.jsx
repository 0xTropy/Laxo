export default function Footer() {
  return (
    <footer className="border-t border-laxo-border py-8">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-display font-semibold text-white">Laxo</span>
        <p className="text-sm text-gray-500">
          Made with ♥ by{' '}
          <a
            href="https://x.com/0xTropyy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-laxo-accent hover:underline"
          >
            @0xTropyy
          </a>
        </p>
      </div>
    </footer>
  )
}
