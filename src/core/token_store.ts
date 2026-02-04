import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const TOKEN_DIR = path.join(os.homedir(), ".config", "paid");
const TOKEN_PATH = path.join(TOKEN_DIR, "token.json");

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
}

export async function readToken(): Promise<TokenData | null> {
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf8");
    return JSON.parse(raw) as TokenData;
  } catch {
    return null;
  }
}

export async function writeToken(data: TokenData) {
  await fs.mkdir(TOKEN_DIR, { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(data, null, 2));
}
