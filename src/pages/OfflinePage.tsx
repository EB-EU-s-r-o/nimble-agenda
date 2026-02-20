export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-2xl font-bold mb-2">Si offline</h1>
      <p className="text-muted-foreground max-w-sm">
        Recepčný režim funguje aj bez internetu. Zmeny sa zosynchronizujú, keď budeš online.
      </p>
      <a
        href="/reception"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
      >
        Otvoriť recepciu
      </a>
    </div>
  );
}
