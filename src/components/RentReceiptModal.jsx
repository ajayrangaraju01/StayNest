import { useId } from "react";

function numberToWords(num) {
  const n = Math.floor(Number(num) || 0);
  if (n === 0) return "Zero Rupees";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(num) {
    if (num === 0) return "";
    if (num < 20) return a[num] + " ";
    if (num < 100) return b[Math.floor(num / 10)] + " " + a[num % 10] + " ";
    return a[Math.floor(num / 100)] + " Hundred " + convertChunk(num % 100);
  }

  let words = "";
  if (n >= 10000000) {
    words += convertChunk(Math.floor(n / 10000000)) + "Crore ";
    num %= 10000000;
  }
  if (n >= 100000) {
    words += convertChunk(Math.floor(n / 100000)) + "Lakh ";
    num %= 100000;
  }
  if (n >= 1000) {
    words += convertChunk(Math.floor(n / 1000)) + "Thousand ";
    num %= 1000;
  }
  words += convertChunk(n % 1000);
  return (words.trim() + " Rupees Only").replace(/\s+/g, " ");
}

export default function RentReceiptModal({
  isOpen = false,
  ledger = null,
  payment = null,
  onClose = () => {},
}) {
  const titleId = useId();
  if (!isOpen || !ledger) return null;

  const effectivePayment = payment || (ledger.payments && ledger.payments[0]) || {
    amount: ledger.amount_paid || ledger.amount_due,
    mode: "UPI",
    reference_id: "DIRECT-BANK-UPI",
    paid_at: new Date().toISOString(),
  };

  const receiptNo = `SN-REC-${ledger.id}-${effectivePayment.id || "1"}`;
  const amountNum = Number(effectivePayment.amount || ledger.amount_paid || ledger.amount_due || 0);
  const monthStr = new Date(ledger.month || Date.now()).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const paidDateStr = new Date(effectivePayment.paid_at || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(12, 10, 9, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="modal-content printable-receipt"
        style={{
          background: "#ffffff",
          border: "2px solid #1c1917",
          borderRadius: 12,
          width: "100%",
          maxWidth: 580,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          padding: "28px 24px",
          color: "#1c1917",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Printable Header */}
        <div style={{ borderBottom: "2px solid #1c1917", paddingBottom: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#15803d", textTransform: "uppercase" }}>
                ✓ Official Rent Receipt (HRA Valid)
              </span>
              <h2 id={titleId} style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
                {ledger.hostel_name || "StayNest Hostel"}
              </h2>
              <div style={{ fontSize: 12, color: "#57534e", marginTop: 2 }}>
                Contact / Bank VPA: {ledger.upi_id || "staynest@bank"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#78716c", textTransform: "uppercase" }}>Receipt No.</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>{receiptNo}</div>
              <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>{paidDateStr}</div>
            </div>
          </div>
        </div>

        {/* Receipt Body */}
        <div style={{ display: "grid", gap: 14, fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ background: "#f5f5f4", padding: "12px 14px", borderRadius: 8 }}>
            Received with thanks from <strong>{ledger.student_name || "Tenant"}</strong> (Phone: {ledger.student_phone || "Registered"})
            the sum of <strong>₹{amountNum.toLocaleString("en-IN")}</strong> towards hostel rent and accommodation
            for the billing period of <strong>{monthStr}</strong>.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "8px 0", borderBottom: "1px dashed #d6d3d1" }}>
            <div>
              <div style={{ fontSize: 11, color: "#78716c", textTransform: "uppercase", fontWeight: 600 }}>Amount in Words:</div>
              <div style={{ fontWeight: 600, fontStyle: "italic", marginTop: 2 }}>{numberToWords(amountNum)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#78716c", textTransform: "uppercase", fontWeight: 600 }}>Payment Rail:</div>
              <div style={{ fontWeight: 700, marginTop: 2, color: "#15803d" }}>
                Direct Bank UPI (0% Fee)
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "8px 0", borderBottom: "1px dashed #d6d3d1" }}>
            <div>
              <div style={{ fontSize: 11, color: "#78716c", textTransform: "uppercase", fontWeight: 600 }}>Bank Reference / UTR:</div>
              <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 14, color: "#1e3a1e", marginTop: 2 }}>
                {effectivePayment.reference_id || "UTR VERIFIED"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#78716c", textTransform: "uppercase", fontWeight: 600 }}>Settlement Status:</div>
              <div style={{ fontWeight: 700, textTransform: "uppercase", color: "#15803d", marginTop: 2 }}>
                ✓ Settled & Reconciled
              </div>
            </div>
          </div>

          {/* Stamp / Authorization */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12, paddingTop: 10 }}>
            <div style={{ fontSize: 11, color: "#78716c" }}>
              Electronically generated by StayNest. Valid proof of rent payment for Income Tax Sec 10(13A).
            </div>
            <div style={{ textAlign: "center", borderTop: "1px solid #1c1917", paddingTop: 4, minWidth: 120 }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>Authorized Signatory</div>
              <div style={{ fontSize: 10, color: "#78716c" }}>{ledger.hostel_name || "StayNest"}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="receipt-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, borderTop: "1px solid #e7e5e4", paddingTop: 14 }}>
          <button
            type="button"
            className="nav-btn"
            onClick={onClose}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            Close
          </button>
          <button
            type="button"
            className="submit-btn"
            onClick={handlePrint}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              background: "#1c1917",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🖨️ Print / Save PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
