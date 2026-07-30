const BLACKCAT_BASE = "https://api.blackcatoficial.com/api";

export interface CreateSaleResult {
  success: boolean;
  message?: string;
  data?: {
    transactionId: string;
    status: string;
    paymentMethod: string;
    amount: number;
    netAmount?: number;
    fees?: number;
    invoiceUrl?: string;
    createdAt?: string;
    paymentData?: {
      qrCode?: string;
      qrCodeBase64?: string;
      copyPaste?: string;
      expiresAt?: string;
    };
  };
}

export interface TransactionStatusResult {
  success: boolean;
  message?: string;
  data?: {
    transactionId: string;
    status: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED" | string;
    paymentMethod?: string;
    amount?: number;
    paidAt?: string;
  };
}

function getApiKey(): string {
  const key = process.env.BLACKCAT_API_KEY;
  if (!key) throw new Error("BLACKCAT_API_KEY não configurada");
  return key;
}

/** Checkout oculto: dados do cliente vêm do servidor, não do usuário */
function getHiddenCustomer() {
  return {
    name: process.env.BLACKCAT_CUSTOMER_NAME || "Linarc Team Cliente",
    email: process.env.BLACKCAT_CUSTOMER_EMAIL || "pagamentos@linarcteam.site",
    phone: process.env.BLACKCAT_CUSTOMER_PHONE || "11999999999",
    document: {
      number: process.env.BLACKCAT_CUSTOMER_CPF || "52998224725",
      type: "cpf" as const,
    },
  };
}

export async function createPixSale(params: {
  amountCents: number;
  months: number;
  externalRef: string;
  metadata?: string;
  postbackUrl?: string;
}): Promise<CreateSaleResult> {
  const body = {
    amount: params.amountCents,
    currency: "BRL",
    paymentMethod: "pix",
    items: [
      {
        title: `MTLC Assinatura ${params.months} mês(es)`,
        unitPrice: params.amountCents,
        quantity: 1,
        tangible: false,
      },
    ],
    customer: getHiddenCustomer(),
    pix: { expiresInDays: 1 },
    postbackUrl: params.postbackUrl,
    metadata: params.metadata || `MTLC ${params.months} meses`,
    externalRef: params.externalRef,
  };

  const res = await fetch(`${BLACKCAT_BASE}/sales/create-sale`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": getApiKey(),
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

export async function getSaleStatus(
  transactionId: string
): Promise<TransactionStatusResult> {
  const res = await fetch(
    `${BLACKCAT_BASE}/sales/${encodeURIComponent(transactionId)}/status`,
    {
      method: "GET",
      headers: { "X-API-Key": getApiKey() },
    }
  );
  return res.json();
}
