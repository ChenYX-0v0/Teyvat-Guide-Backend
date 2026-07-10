export const defaultLocale = "zh-CN";

export const messages = {
  "zh-CN": {
    app: {
      title: "CodeLog",
      subtitle: "个人技术分享博客",
      slogan: "记录开发实践、沉淀技术思考，把每一次解决问题的过程分享出来。",
      stable: "持续创作",
      encrypted: "专注技术",
      permission: "分享成长",
    },
    login: {
      welcome: "欢迎回来",
      description: "登录你的博客创作后台",
      username: "用户名",
      usernamePlaceholder: "请输入用户名",
      password: "密码",
      passwordPlaceholder: "请输入密码",
      submit: "登 录",
      helper: "如需注册或找回密码，请联系系统管理员",
      requiredUsername: "请输入用户名",
      requiredPassword: "请输入密码",
      networkError: "网络异常，请稍后重试。",
      invalidCredentials: "用户名或密码错误。",
      serverBusy: "服务器繁忙，请稍后重试。",
    },
    success: {
      title: "登录成功",
      description: "灵感就绪，开始今天的技术创作吧",
      enterAdmin: "进入创作后台",
    },
    admin: {
      title: "管理后台",
      subtitle: "用户管理系统",
      totalUsers: "总用户",
      admins: "管理员",
      userList: "用户列表",
      noUsers: "暂无用户",
      id: "ID",
      username: "用户名",
      permissionLevel: "权限等级",
      createdAt: "创建时间",
      superAdmin: "超级管理员",
      normalUser: "普通用户",
      createUser: "创建用户",
      changePassword: "修改密码",
      setPermission: "设置权限",
      deleteUser: "删除用户",
      password: "密码",
      newPassword: "新密码",
      inputUsername: "请输入用户名",
      inputPassword: "请输入密码",
      inputNewPassword: "请输入新密码",
      inputDeleteUsername: "请输入要删除的用户名",
      reset: "重置",
      confirmDelete: "确认删除",
      cancel: "取消",
      deleteConfirmText: "确定要删除用户 {{username}} 吗？此操作不可撤销。",
      createSuccess: "用户创建成功",
      passwordSuccess: "密码修改成功",
      permissionSuccess: "权限设置成功",
      deleteSuccess: "用户 {{username}} 已删除",
      createFailed: "创建失败",
      changeFailed: "修改失败",
      permissionFailed: "设置失败",
      deleteFailed: "删除失败",
      usernameExists: "用户名已存在",
      userNotFound: "用户不存在",
    },
  },
};

export type Locale = keyof typeof messages;
export type MessageKey = string;

export function translate(key: MessageKey, params?: Record<string, string | number>) {
  const value = key.split(".").reduce<unknown>((obj, part) => {
    if (obj && typeof obj === "object" && part in obj) {
      return (obj as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages[defaultLocale]);

  if (typeof value !== "string") return key;

  if (!params) return value;

  return Object.entries(params).reduce(
    (text, [name, val]) => text.replaceAll(`{{${name}}}`, String(val)),
    value,
  );
}
