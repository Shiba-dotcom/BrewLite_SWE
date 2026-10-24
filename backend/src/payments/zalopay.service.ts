import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

export interface ZaloPayCreateOrderParams {
  orderId: number;
  amount: number;
  description?: string;
  appUser?: string;
}

export interface ZaloPayCreateOrderResult {
  returnCode: number;
  returnMessage: string;
  subReturnCode: number;
  subReturnMessage: string;
  orderUrl?: string;
  zpTransToken?: string;
  orderToken?: string;
  appTransId: string;
}

export interface ZaloPayQueryResult {
  returnCode: number;
  returnMessage: string;
  subReturnCode: number;
  subReturnMessage: string;
  isProcessing: boolean;
  amount: number;
  zpTransId: number;
}

@Injectable()
export class ZaloPayService {
  private readonly logger = new Logger(ZaloPayService.name);

  readonly appId = Number(process.env.ZALOPAY_APP_ID || 2554);
  readonly key1 = process.env.ZALOPAY_KEY1 || 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn';
  readonly key2 = process.env.ZALOPAY_KEY2 || 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf';
  readonly createEndpoint =
    process.env.ZALOPAY_CREATE_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
  readonly queryEndpoint =
    process.env.ZALOPAY_QUERY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/query';
  readonly callbackUrl =
    process.env.ZALOPAY_CALLBACK_URL || 'http://localhost:3001/payments/zalopay/callback';

  /**
   * Sinh mã giao dịch app_trans_id theo định dạng chuẩn yymmdd_xxxx của ZaloPay
   */
  generateAppTransId(orderId: number): string {
    const now = new Date();
    // Giờ Việt Nam (GMT+7)
    const vnTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const yy = vnTime.getFullYear().toString().slice(-2);
    const mm = ('0' + (vnTime.getMonth() + 1)).slice(-2);
    const dd = ('0' + vnTime.getDate()).slice(-2);
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${yy}${mm}${dd}_${orderId}_${randomSuffix}`;
  }

  /**
   * Tính chữ ký MAC (HMAC-SHA256) cho yêu cầu tạo đơn hàng
   * Công thức ZaloPay v2: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
   */
  computeCreateOrderMac(params: {
    appTransId: string;
    appUser: string;
    amount: number;
    appTime: number;
    embedData: string;
    item: string;
  }): string {
    const { appTransId, appUser, amount, appTime, embedData, item } = params;
    const data = [
      this.appId,
      appTransId,
      appUser,
      amount,
      appTime,
      embedData,
      item,
    ].join('|');
    return createHmac('sha256', this.key1).update(data).digest('hex');
  }

  /**
   * Tạo đơn hàng thanh toán trên máy chủ ZaloPay Sandbox
   */
  async createOrder(params: ZaloPayCreateOrderParams): Promise<ZaloPayCreateOrderResult> {
    const { orderId, amount, description, appUser = 'brewlite_customer' } = params;
    const appTransId = this.generateAppTransId(orderId);
    const appTime = Date.now();
    const embedData = JSON.stringify({
      redirecturl: 'http://localhost:3000/order-success',
      orderId,
    });
    const item = JSON.stringify([]);
    const orderDescription = description || `BrewLite - Thanh toán đơn hàng #${orderId}`;

    const mac = this.computeCreateOrderMac({
      appTransId,
      appUser,
      amount,
      appTime,
      embedData,
      item,
    });

    const payload = {
      app_id: this.appId.toString(),
      app_user: appUser,
      app_trans_id: appTransId,
      app_time: appTime.toString(),
      amount: amount.toString(),
      item,
      description: orderDescription,
      embed_data: embedData,
      bank_code: '',
      callback_url: this.callbackUrl,
      mac,
    };

    this.logger.log(`[ZaloPay] Gửi yêu cầu tạo đơn #${orderId} (app_trans_id: ${appTransId}, amount: ${amount})`);

    try {
      const body = new URLSearchParams(payload).toString();
      const response = await fetch(this.createEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      const data = await response.json();

      this.logger.log(`[ZaloPay] Kết quả tạo đơn #${orderId}: ${JSON.stringify(data)}`);

      return {
        returnCode: data.return_code,
        returnMessage: data.return_message,
        subReturnCode: data.sub_return_code,
        subReturnMessage: data.sub_return_message,
        orderUrl: data.order_url,
        zpTransToken: data.zp_trans_token,
        orderToken: data.order_token,
        appTransId,
      };
    } catch (error: any) {
      this.logger.error(`[ZaloPay] Lỗi kết nối khi tạo đơn #${orderId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Xác thực chữ ký Callback từ ZaloPay bằng Key2 (Data Integrity Verification)
   */
  verifyCallback(dataStr: string, requestMac: string): boolean {
    const computedMac = createHmac('sha256', this.key2).update(dataStr).digest('hex');
    return computedMac === requestMac;
  }

  /**
   * Tạo callback payload giả lập kèm chữ ký MAC hợp lệ bằng Key2 (dành cho Cổng ZaloPay Sandbox Gateway)
   */
  createMockCallbackPayload(orderId: number, amount: number, appTransId: string, zpTransId = Date.now()) {
    const dataObj = {
      app_id: this.appId,
      app_trans_id: appTransId,
      app_time: Date.now(),
      app_user: 'zalopay_sandbox_user',
      amount,
      embed_data: JSON.stringify({ orderId }),
      item: JSON.stringify([]),
      zp_trans_id: zpTransId,
      server_time: Date.now(),
      channel: 38,
      merchant_user_id: `user_${orderId}`,
    };
    const dataStr = JSON.stringify(dataObj);
    const mac = createHmac('sha256', this.key2).update(dataStr).digest('hex');
    return { data: dataStr, mac, type: 1 };
  }


  /**
   * Tra cứu trạng thái giao dịch từ máy chủ ZaloPay qua API v2/query
   */
  async queryStatus(appTransId: string): Promise<ZaloPayQueryResult> {
    const data = [this.appId, appTransId, this.key1].join('|');
    const mac = createHmac('sha256', this.key1).update(data).digest('hex');

    const body = new URLSearchParams({
      app_id: this.appId.toString(),
      app_trans_id: appTransId,
      mac,
    }).toString();

    try {
      const response = await fetch(this.queryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      const res = await response.json();
      return {
        returnCode: res.return_code,
        returnMessage: res.return_message,
        subReturnCode: res.sub_return_code,
        subReturnMessage: res.sub_return_message,
        isProcessing: Boolean(res.is_processing),
        amount: Number(res.amount || 0),
        zpTransId: Number(res.zp_trans_id || 0),
      };
    } catch (error: any) {
      this.logger.error(`[ZaloPay] Lỗi tra cứu app_trans_id ${appTransId}: ${error.message}`);
      throw error;
    }
  }
}
