// packages/ultracontrol-app/src/lib/interfaces/core.ts
export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  // 他のユーザープロファイル情報
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface GlobalSettings {
  // アプリケーション全体のグローバル設定項目
  maxFileSize: number;
  supportedLanguages: string[];
}

// APIエンドポイントの例 (コメントとして)
// GET /api/v1/auth/me -> UserProfile
// POST /api/v1/auth/login -> AuthResponse
// GET /api/v1/settings -> GlobalSettings
