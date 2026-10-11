/** Fallback do Suspense enquanto o arquivo de uma página é baixado. */
export default function PageLoader({ fullScreen = false }) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? "min-h-screen bg-void" : "min-h-[50vh]"}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-glow/15 border-t-glow shadow-[0_0_24px_-4px_rgb(var(--glow)/0.7)]" />
    </div>
  );
}
