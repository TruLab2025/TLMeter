type TpayCreateTransactionInput = {
  plan: "lite" | "pro" | "premium";
  email: string;
  description: string;
  hiddenDescription: string;
  amount: number;
  successUrl: string;
  errorUrl: string;
  notificationUrl: string;
};

type TpayCreateTransactionResult = {
  transactionId: string;
  paymentUrl: string;
  raw: any;
};

const TPAY_PLAN_PRICE: Record<"lite" | "pro" | "premium", number> = {
  lite: 9,
  pro: 19,
  premium: 29,
};

const tokenCache: { value: string | null; expiresAt: number } = {
  value: null,
  expiresAt: 0,
};

function getTpayBaseUrl(): string {
  const mode = (process.env.TPAY_MODE || "sandbox").toLowerCase();
  if (mode === "production" || mode === "prod") return "https://api.tpay.com";
  return "https://openapi.sandbox.tpay.com";
}

function assertTpayConfig() {
  const clientId = process.env.TPAY_CLIENT_ID;
  const clientSecret = process.env.TPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing TPAY_CLIENT_ID or TPAY_CLIENT_SECRET");
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache.value && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.value;
  }

  const { clientId, clientSecret } = assertTpayConfig();
  const form = new FormData();
  form.append("client_id", clientId);
  form.append("client_secret", clientSecret);

  const res = await fetch(`${getTpayBaseUrl()}/oauth/auth`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tpay auth failed (${res.status}): ${text}`);
  }

  const data = await res.json() as any;
  const accessToken = data?.access_token;
  const expiresIn = Number(data?.expires_in ?? 3600);

  if (!accessToken) {
    throw new Error("Tpay auth response missing access_token");
  }

  tokenCache.value = accessToken;
  tokenCache.expiresAt = now + Math.max(60, expiresIn - 60) * 1000;
  return accessToken;
}

export async function createTpayTransaction(input: TpayCreateTransactionInput): Promise<TpayCreateTransactionResult> {
  const token = await getAccessToken();

  const payload = {
    amount: input.amount,
    currency: "PLN",
    description: input.description,
    hiddenDescription: input.hiddenDescription,
    payer: {
      email: input.email,
      name: input.email.split("@")[0] || "User",
    },
    pay: {
      groupId: null,
      channelId: null,
      method: null,
    },
    callbacks: {
      payerUrls: {
        success: input.successUrl,
        error: input.errorUrl,
      },
      notification: {
        url: input.notificationUrl,
      },
    },
  };

  const res = await fetch(`${getTpayBaseUrl()}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Tpay create transaction failed (${res.status}): ${JSON.stringify(body)}`);
  }

  const transactionId = body?.transactionId || body?.id || body?.title;
  const paymentUrl = body?.transactionPaymentUrl || body?.paymentUrl || body?.url;

  if (!transactionId || !paymentUrl) {
    throw new Error("Tpay response missing transactionId or paymentUrl");
  }

  return {
    transactionId,
    paymentUrl,
    raw: body,
  };
}

export function getPlanPrice(plan: "lite" | "pro" | "premium"): number {
  return TPAY_PLAN_PRICE[plan];
}

export function isSuccessfulTpayStatus(status: unknown): boolean {
  const normalized = String(status || "").toLowerCase();
  return ["correct", "success", "paid", "completed"].includes(normalized);
}

export function extractTpayTransactionId(payload: any): string | null {
  return payload?.transactionId || payload?.tr_id || payload?.id || payload?.title || null;
}
