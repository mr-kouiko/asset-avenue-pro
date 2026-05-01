/**
 * Generates an HTML invoice for a PayPal order and triggers print/download.
 * The user can save it as PDF via the browser's print dialog.
 */

interface InvoiceItem {
  title: string;
  price: number;
}

export interface InvoiceData {
  orderId: string;
  paypalOrderId: string;
  date: string;
  buyerName: string;
  buyerEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  currency: string;
  orderType: string;
  packType?: string | null;
  creditsAmount?: number | null;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const fmtMoney = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(n || 0));

export const buildInvoiceHtml = (data: InvoiceData): string => {
  const itemsRows = data.items.length
    ? data.items
        .map(
          (it) => `
        <tr>
          <td>${escapeHtml(it.title)}</td>
          <td style="text-align:right">${fmtMoney(it.price, data.currency)}</td>
        </tr>`
        )
        .join("")
    : `<tr><td>${escapeHtml(
        data.orderType === "infinity"
          ? `Infinity Subscription (${data.packType ?? ""})`
          : data.orderType === "credits" || data.orderType === "videoai_credits"
          ? `${data.creditsAmount ?? 0} credits (${data.packType ?? ""})`
          : "Marketplace purchase"
      )}</td><td style="text-align:right">${fmtMoney(data.total, data.currency)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(data.orderId.slice(0, 8))} - VisuStock</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; margin: 0; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px; }
  .brand { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
  .brand-sub { color: #666; font-size: 13px; margin-top: 4px; }
  .invoice-meta { text-align: right; font-size: 13px; color: #666; }
  .invoice-meta strong { color: #1a1a1a; display: block; font-size: 16px; margin-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
  .grid h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin: 0 0 8px 0; }
  .grid p { margin: 2px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { text-align: left; padding: 12px 8px; background: #f5f5f5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  th:last-child { text-align: right; }
  td { padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
  .totals { margin-left: auto; width: 280px; }
  .totals tr td { border: none; padding: 6px 8px; }
  .totals tr.total td { font-size: 18px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 12px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; text-align: center; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; background: #e8f5e9; color: #2e7d32; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
  .actions { text-align: center; margin: 30px 0; }
  .btn { display: inline-block; padding: 10px 24px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">VisuStock</div>
      <div class="brand-sub">contact@visustock.com · visustock.com</div>
    </div>
    <div class="invoice-meta">
      <strong>Invoice</strong>
      #${escapeHtml(data.orderId.slice(0, 8).toUpperCase())}<br/>
      ${escapeHtml(new Date(data.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}<br/>
      <span class="badge">PAID</span>
    </div>
  </div>

  <div class="grid">
    <div>
      <h3>Billed to</h3>
      <p><strong>${escapeHtml(data.buyerName)}</strong></p>
      <p>${escapeHtml(data.buyerEmail)}</p>
    </div>
    <div>
      <h3>Payment</h3>
      <p>PayPal</p>
      <p style="color:#888;font-size:12px">Order ID: ${escapeHtml(data.paypalOrderId)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th>Amount</th></tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal</td><td style="text-align:right">${fmtMoney(data.subtotal, data.currency)}</td></tr>
    <tr class="total"><td>Total</td><td style="text-align:right">${fmtMoney(data.total, data.currency)}</td></tr>
  </table>

  <div class="actions no-print">
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="footer">
    Thank you for your purchase. This invoice was generated electronically and is valid without signature.<br/>
    For questions, contact contact@visustock.com
  </div>
</body>
</html>`;
};

export const downloadInvoice = (data: InvoiceData) => {
  const html = buildInvoiceHtml(data);
  const win = window.open("", "_blank");
  if (!win) {
    // Popup blocked: fall back to blob download
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${data.orderId.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  win.document.write(html);
  win.document.close();
};
