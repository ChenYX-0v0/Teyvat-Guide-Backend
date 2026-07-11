import { LoginForm } from "@/components/LoginForm";

export default function Home() {
  console.log(`[page:home] 渲染管理员登录页 | 时间=${new Date().toISOString()}`);
  return (
    <main className="flex min-h-screen flex-col bg-slate-900">
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 font-mono text-xl font-bold text-emerald-400">
              &lt;/&gt;
            </div>
            <h1 className="text-xl font-bold text-slate-900">CodeLog 管理后台</h1>
            <p className="mt-2 text-sm text-slate-500">仅限授权管理员登录</p>
          </div>
          <LoginForm />
        </div>
      </div>
      <footer className="py-4 text-center text-xs text-slate-500">
        CodeLog Admin &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
