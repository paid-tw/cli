import { Command } from "commander";
import { startOauthLogin, getAuthStatus } from "../core/oauth.js";
import { success, error, formatOutput } from "../core/output.js";

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
    .option("--json", "JSON 格式輸出")
    .action(async (opts) => {
      try {
        const result = await startOauthLogin(opts.scopes);
        const response = success(result, {
          command: "tw auth login",
        });

        if (opts.json) {
          console.log(formatOutput(response, true));
        } else {
          console.log("請在瀏覽器完成登入：");
          console.log(result.verificationUri);
          console.log("device_code:", result.deviceCode);
          console.log("user_code:", result.userCode);
        }
      } catch (err) {
        const response = error(
          "AUTH_LOGIN_FAILED",
          err instanceof Error ? err.message : String(err),
          err,
          { command: "tw auth login" }
        );
        console.error(formatOutput(response, opts.json ?? false));
        process.exit(1);
      }
    });

  auth
    .command("status")
    .description("顯示目前登入狀態")
    .option("--json", "JSON 格式輸出")
    .action(async (opts) => {
      try {
        const status = await getAuthStatus();
        const response = success(status, {
          command: "tw auth status",
        });

        if (opts.json) {
          console.log(formatOutput(response, true));
        } else {
          if (!status.loggedIn) {
            console.log("尚未登入。請執行 paid tw auth login");
            return;
          }
          console.log("已登入");
          console.log("expires_at:", status.expiresAt);
          console.log("scopes:", status.scopes.join(" "));
        }
      } catch (err) {
        const response = error(
          "AUTH_STATUS_FAILED",
          err instanceof Error ? err.message : String(err),
          err,
          { command: "tw auth status" }
        );
        console.error(formatOutput(response, opts.json ?? false));
        process.exit(1);
      }
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
