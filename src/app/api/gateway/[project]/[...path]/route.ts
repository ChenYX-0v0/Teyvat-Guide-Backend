import { NextRequest, NextResponse } from "next/server";
import { applyProjectAuthHeaders, findEnabledProject, PROJECT_CODE_PATTERN } from "@/lib/projects";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM_TIMEOUT_MS = 15000;

async function forward(request: NextRequest, context: { params: Promise<{ project: string; path: string[] }> }) {
  const user = await getCurrentUser();
  if (!user || user.permissionLevel !== 0) {
    return NextResponse.json({ success: false, message: "未登录或无权限" }, { status: 401 });
  }

  const { project: rawCode, path } = await context.params;
  if (!PROJECT_CODE_PATTERN.test(rawCode)) {
    return NextResponse.json({ success: false, message: "非法的项目标识" }, { status: 400 });
  }

  const project = await findEnabledProject(rawCode);
  if (!project) {
    return NextResponse.json({ success: false, message: "项目不存在或未启用" }, { status: 404 });
  }

  const upstreamUrl = `${project.baseUrl.replace(/\/+$/, "")}/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers({ Accept: "application/json" });
  applyProjectAuthHeaders(project, headers);

  const init: RequestInit = { method: request.method, headers, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
  }

  let upstream: Response;
  try {
    console.log(`[gateway] 转发请求 | project=${project.code} url=${upstreamUrl} method=${request.method} | 时间=${new Date().toISOString()}`);
    upstream = await fetch(upstreamUrl, init);
  } catch {
    console.error(`[gateway] 上游不可达 | project=${project.code} url=${upstreamUrl} | 时间=${new Date().toISOString()}`);
    return NextResponse.json({ success: false, message: `${project.name} 服务不可达` }, { status: 502 });
  }

  // 业务项目统一响应 { code, message, data }，code === 0 为成功，归一化为本系统 { success, message, data }
  const text = await upstream.text();
  try {
    const parsed = JSON.parse(text) as { code?: unknown; message?: unknown; data?: unknown };
    if (parsed && typeof parsed === "object" && "code" in parsed) {
      const ok = parsed.code === 0;
      return NextResponse.json(
        {
          success: ok,
          message: ok ? "ok" : typeof parsed.message === "string" && parsed.message ? parsed.message : "上游返回异常",
          data: parsed.data,
        },
        { status: ok ? 200 : upstream.status },
      );
    }
  } catch {
    // 非 JSON 响应，原样透传
  }
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "text/plain; charset=utf-8" },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ project: string; path: string[] }> }) {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ project: string; path: string[] }> }) {
  return forward(request, context);
}
