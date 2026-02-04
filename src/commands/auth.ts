import { Command } from "commander";
import { startOauthLogin, getAuthStatus } from "../core/oauth.js";

export function registerTwCommands(program: Command) {
  const tw = program
    .command("tw")
    .description("paid‑tw 加值服務（選用）");

  const auth = tw
    .command("auth")
    .description("OAuth 登入與狀態（僅在使用 paid.tw API 時需要）");

  auth
    .command("login")
    .description("透過 paid‑tw OAuth 登入（選用）")
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

  auth.addHelpText(
    "after",
    `\nExamples:\n  paid tw auth login\n  paid tw auth login --scopes "payments:read payments:write refunds:write"\n  paid tw auth status\n`
  );

  tw.addHelpText(
    "after",
    `\nExamples:\n  paid tw auth login\n  paid tw auth status\n`
  );
}
