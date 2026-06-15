import { Header } from "./Header";

export function AppShell({
  children,
  hasData = false,
}: {
  children: React.ReactNode;
  hasData?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header hasData={hasData} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Foreign Flow Detective · 정보 제공 목적 · 투자 판단에 사용하지 마세요
        </p>
      </footer>
    </div>
  );
}
