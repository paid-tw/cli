import { Command } from "commander";
import { startOauthLogin, getAuthStatus } from "../core/oauth.js";

export function registerAuthCommands(program: Command) {
  const auth = program.command("auth").description("OAuth 登入與狀態");

  auth
    .command("login")
    .description("透過 paid‑tw OAuth 登入")
    .option("--scopes <scopes>", "OAuth scopes", "payments:read payments:write")
    .action(async (opts) => {
      const result = await startOauthLogin(opts.scopes);
      console.log("請在瀏覽器完成登入：");
      console.log(result.verificationUri);
      console.log("device_code:", result.deviceCode);
      console.log("user_code:", result.userCode);
    });

  auth
    .command("status")
    .description("顯示目前登入狀態")
    .action(async () => {
      const status = await getAuthStatus();
      if (!status.loggedIn) {
        console.log("尚未登入。請執行 paid auth login");
        return;
      }
      console.log("已登入");
      console.log("expires_at:", status.expiresAt);
      console.log("scopes:", status.scopes.join(" "));
    });
}
