import { LoginForm } from "@/components/LoginForm";
import { translate as t } from "@/lib/i18n";

export default function Home() {
  console.log(`[page:home] 渲染首页 | 时间=${new Date().toISOString()}`);
  return (
    <main className="flex min-h-screen">
      <div className="hidden w-1/2 items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 lg:flex">
        <div className="max-w-md text-white">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 font-mono text-xl font-bold backdrop-blur">
              &lt;/&gt;
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("app.title")}</h1>
              <p className="text-sm text-blue-200">{t("app.subtitle")}</p>
            </div>
          </div>
          <p className="text-lg leading-relaxed text-blue-100">{t("app.slogan")}</p>
          <div className="mt-10 flex gap-4 text-sm text-blue-200">
            <span className="flex items-center gap-1.5">
              <span className="block h-1.5 w-1.5 rounded-full bg-green-400" />
              {t("app.stable")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="block h-1.5 w-1.5 rounded-full bg-green-400" />
              {t("app.encrypted")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="block h-1.5 w-1.5 rounded-full bg-green-400" />
              {t("app.permission")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-zinc-50 px-6 lg:w-1/2">
        <LoginForm />
      </div>
    </main>
  );
}
