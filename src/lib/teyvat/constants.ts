/**
 * 服务端与客户端**共享**的常量（中性模块，没有 `import "server-only"`）。
 *
 * ⚠️ 为什么要单独一个文件：Client Component **不能**从带 `import "server-only"` 的模块里
 * import 任何**运行时值**（`import type` 可以，类型在编译期就被擦除）。一旦从
 * `@/lib/teyvat-*` 里 import 了值，构建会直接失败：
 *
 *   You're importing a module that depends on "server-only".
 *
 * 所以：常量/枚举放这里；只有服务端才用的东西才留在 `teyvat-*.ts` 里。
 */

/** 5 万观察线：当日 token 超过它就该被看到（**不是限制** —— 拦截线 10 万在主服务侧强制） */
export const DAILY_TOKEN_WATCH_THRESHOLD = 50_000;
