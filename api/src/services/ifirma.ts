type IfirmaInvoiceInput = {
  email: string;
  plan: string;
  amount: number;
  paymentTransactionId: string;
  licenseCode: string;
};

export async function createIfirmaInvoice(input: IfirmaInvoiceInput): Promise<{ success: boolean; invoiceId?: string; raw?: any; skipped?: boolean }> {
  const apiUrl = process.env.IFIRMA_API_URL;
  const apiKey = process.env.IFIRMA_API_KEY;

  if (!apiUrl || !apiKey) {
    console.log("[iFirma] Missing IFIRMA_API_URL/IFIRMA_API_KEY. Invoice creation skipped.");
    return { success: false, skipped: true };
  }

  const payload = {
    customer: {
      email: input.email,
    },
    invoice: {
      title: `TruLab Meter ${input.plan.toUpperCase()}`,
      external_id: input.paymentTransactionId,
      notes: `License: ${input.licenseCode}`,
      currency: "PLN",
    },
    items: [
      {
        name: `TruLab Meter ${input.plan.toUpperCase()} - subskrypcja`,
        quantity: 1,
        unit_price: input.amount,
      },
    ],
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("[iFirma] Invoice create failed", res.status, body);
    return { success: false, raw: body };
  }

  return {
    success: true,
    invoiceId: body?.id || body?.invoiceId || body?.number,
    raw: body,
  };
}
