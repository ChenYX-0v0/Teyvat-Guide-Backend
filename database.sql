CREATE DATABASE IF NOT EXISTS demo_project
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE demo_project;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL COMMENT 'E.164 格式手机号，例如 +8613800138000',
  phone_verified_at TIMESTAMP NULL DEFAULT NULL,
  permission_level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_sessions_token_hash (token_hash),
  KEY idx_user_sessions_user (user_id, expires_at),
  KEY idx_user_sessions_expiry (expires_at),
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id CHAR(36) NOT NULL COMMENT '对外暴露的验证码请求 ID',
  phone VARCHAR(20) NOT NULL COMMENT 'E.164 格式手机号',
  purpose ENUM('login', 'bind_phone', 'change_phone', 'recover_account') NOT NULL DEFAULT 'login',
  code_hash CHAR(64) NOT NULL COMMENT '验证码的 HMAC-SHA256，不保存明文验证码',
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP NULL DEFAULT NULL,
  attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
  sent_ip_hash CHAR(64) NULL COMMENT '发送方 IP 的不可逆哈希',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_phone_codes_request_id (request_id),
  KEY idx_phone_codes_verify (phone, purpose, consumed_at, expires_at),
  KEY idx_phone_codes_send_limit (phone, purpose, created_at),
  KEY idx_phone_codes_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS managed_projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL COMMENT '项目唯一标识，如 teyvat-guide',
  name VARCHAR(100) NOT NULL COMMENT '项目显示名',
  base_url VARCHAR(255) NOT NULL COMMENT '业务项目服务地址',
  auth_type VARCHAR(32) NOT NULL DEFAULT 'none' COMMENT '鉴权方式：header-key / bearer / none',
  auth_config VARCHAR(255) NULL COMMENT '凭证（优先使用环境变量覆盖）',
  health_path VARCHAR(255) NOT NULL DEFAULT '/api/health' COMMENT '健康检查路径',
  status VARCHAR(16) NOT NULL DEFAULT 'enabled' COMMENT 'enabled / disabled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_managed_projects_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_code VARCHAR(64) NOT NULL COMMENT '业务项目 code',
  action VARCHAR(64) NOT NULL COMMENT '动作，如 assets.reload',
  status VARCHAR(16) NOT NULL DEFAULT 'failed' COMMENT 'failed / sent',
  http_status INT NULL COMMENT '上游 HTTP 状态码',
  message VARCHAR(500) NOT NULL COMMENT '结果说明',
  attempts INT NOT NULL DEFAULT 1 COMMENT '投递尝试次数',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_notifications_code_status (project_code, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  summary VARCHAR(500) NOT NULL DEFAULT '',
  content LONGTEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '技术随笔',
  tags VARCHAR(500) NOT NULL DEFAULT '',
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_slug (slug),
  KEY idx_posts_status_updated (status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
