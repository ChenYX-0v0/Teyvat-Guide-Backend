/** 将 RFC3339 时间串按浏览器本地时区格式化显示（纯函数，服务端/客户端均可用） */
export function formatLocalTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}
