import { Command } from "commander";
import { getConfig } from "../core/config.js";
import { formatDoctorPretty, runDoctor } from "../core/doctor.js";

export function registerDoctorCommand(program: Command) {
  program
    .command("doctor")
    .description("檢查設定與環境變數")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .option("--format <format>", "輸出格式 (json/pretty)")
    .action(async (opts) => {
      try {
        const cfg = await getConfig();
        const result = await runDoctor(opts.provider, cfg);
        const format = opts.format === "json" ? "json" : "pretty";

        if (format === "json") {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatDoctorPretty(result));
        }

        if (result.env.missing.length) {
          throw new Error("缺少必要環境變數");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "doctor 失敗";
        console.error("Doctor 失敗");
        console.error(message);
        console.error("建議：請指定 --provider 或設定預設 provider");
        console.error("例如：paid doctor --provider=payuni");
        console.error("或：paid config set --default-provider=payuni");
        process.exitCode = 1;
      }
    });
}
