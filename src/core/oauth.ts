import { readToken, writeToken } from "./token_store.js";

export interface DeviceCodeResult {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
}

export async function startOauthLogin(scopes: string): Promise<DeviceCodeResult> {
  // TODO: 接上 paid‑tw OAuth Device Flow
  // 目前回傳 placeholder 便於 CLI flow 成形
  const mock: DeviceCodeResult = {
    deviceCode: "mock_device_code",
    userCode: "MOCK-USER",
    verificationUri: "https://paid.tw/oauth/device",
    expiresIn: 900
  };

  await writeToken({
    accessToken: "mock_access_token",
    refreshToken: "mock_refresh_token",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    scopes: scopes.split(" ")
  });

  return mock;
}

export async function getAuthStatus() {
  const token = await readToken();
  if (!token?.accessToken) {
    return { loggedIn: false } as const;
  }

  return {
    loggedIn: true,
    expiresAt: token.expiresAt ?? "unknown",
    scopes: token.scopes ?? []
  } as const;
}
