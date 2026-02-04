import { ProviderAdapter } from "../core/providers.js";

export class PayuniProvider implements ProviderAdapter {
  name = "payuni" as const;

  async createPayment(input: unknown) {
    // TODO: 實作 PAYUNi 建立交易 API
    return {
      ok: false,
      message: "PAYUNi createPayment 尚未實作",
      input
    };
  }

  async getPayment(input: unknown) {
    // TODO: 實作 PAYUNi 查詢交易 API
    return {
      ok: false,
      message: "PAYUNi getPayment 尚未實作",
      input
    };
  }

  async refundPayment(input: unknown) {
    // TODO: 實作 PAYUNi 退款 API
    return {
      ok: false,
      message: "PAYUNi refundPayment 尚未實作",
      input
    };
  }
}
