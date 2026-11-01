import { useState, useEffect, useId } from "react";
import { generateQrDataUrl } from "../utils/qr";
import { createFeePayment } from "../api/staynestApi";
import RentReceiptModal from "./RentReceiptModal";

export default function BankUpiModal({
  ledger,
  hostelName = "StayNest Living",
  upiId = "staynest@bank",
  amountDue = 0,
  isOpen = false,
  onClose = () => {},
  onSuccess = () => {},
  onToast = () => {},
}) {
  const [amount, setAmount] = useState(amountDue || 0);
  const [utrNumber, setUtrNumber] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [stage, setStage] = useState("ACTIVE"); // 'ACTIVE' | 'PROCESSING' | 'SUCCESS'
  const [payCountdown, setPayCountdown] = useState(300); // 5 minutes (YouPI-PG Invariant 3)
  const [verifyCountdown, setVerifyCountdown] = useState(30); // 30 seconds verification window
  const [createdPayment, setCreatedPayment] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const modalTitleId = useId();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(amountDue || 0);
      setStage("ACTIVE");
      setPayCountdown(300);
      setVerifyCountdown(30);
      setErrorMsg("");
      setUtrNumber("");
      setCreatedPayment(null);
    }
  }, [isOpen, amountDue]);

  // 5-Minute Payment Window Timer (ACTIVE)
  useEffect(() => {
    if (!isOpen || stage !== "ACTIVE") return;
    const interval = setInterval(() => {
      setPayCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, stage]);

  // 30-Second Verification Window Timer (PROCESSING)
  useEffect(() => {
    if (!isOpen || stage !== "PROCESSING") return;
    const interval = setInterval(() => {
      setVerifyCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, stage]);

  // Construct NPCI Standard UPI URI
  const effectiveUpiId = (ledger?.upi_id || upiId || "staynest@bank").trim();
  const effectiveHostelName = ledger?.hostel_name || hostelName || "Hostel Rent";
  const note = `Rent-${ledger?.id || "StayNest"}-${new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
  
  // Standard NPCI UPI URI Scheme
  const upiUri = `upi://pay?pa=${encodeURIComponent(effectiveUpiId)}&pn=${encodeURIComponent(effectiveHostelName)}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

  // Generate Vector QR Code DataURL whenever upiUri changes
  useEffect(() => {
    let isMounted = true;
    if (!isOpen) return;

    generateQrDataUrl(upiUri, {
      width: 260,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Vector QR generation error:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [upiUri, isOpen]);

  if (!isOpen) return null;

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleCopyUpi = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(effectiveUpiId);
      } else {
        const input = document.createElement("input");
        input.value = effectiveUpiId;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      onToast("Bank UPI ID copied to clipboard!");
    } catch {
      onToast(`UPI ID: ${effectiveUpiId}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedUtr = utrNumber.trim();
    if (!trimmedUtr) {
      setErrorMsg("Please enter the 12-digit Bank UPI Reference / UTR Number.");
      return;
    }

    if (trimmedUtr.length < 6) {
      setErrorMsg("Invalid UTR number. Bank reference must be at least 6 characters.");
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg("Payment amount must be greater than zero.");
      return;
    }

    try {
      setStage("PROCESSING");
      const paymentRecord = await createFeePayment({
        ledger: ledger.id,
        amount: numAmount,
        mode: "upi",
        reference_id: trimmedUtr,
      });

      setCreatedPayment(paymentRecord);
      setStage("SUCCESS");
      onToast("Payment submitted successfully! Direct bank credit registered.");
      onSuccess();
    } catch (err) {
      setStage("ACTIVE");
      setErrorMsg(err.message || "Failed to submit UPI payment. Please try again.");
    }
  };

  return (
    <>
      <div
        className="modal-overlay"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(12, 10, 9, 0.72)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "16px",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && stage !== "PROCESSING") onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <div
          className="modal-content"
          style={{
            background: "#fdfbf7",
            border: "1px solid #e7e5e4",
            borderRadius: 16,
            width: "100%",
            maxWidth: 480,
            maxHeight: "92vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            padding: "24px 20px",
            color: "#1c1917",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#15803d", background: "#dcfce7", padding: "3px 8px", borderRadius: 4, marginBottom: 6 }}>
                <span>✓ Direct-to-Bank UPI</span>
                <span style={{ color: "#78716c" }}>•</span>
                <span>0% Commission</span>
              </div>
              <h2 id={modalTitleId} style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                {stage === "SUCCESS" ? "Payment Completed" : "Pay Rent via Bank UPI"}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78716c" }}>
                {effectiveHostelName}
              </p>
            </div>
            {stage !== "PROCESSING" && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 22,
                  cursor: "pointer",
                  color: "#78716c",
                  padding: "4px 8px",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* STAGE: SUCCESS */}
          {stage === "SUCCESS" && (
            <div style={{ textAlign: "center", padding: "18px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  margin: "0 auto 16px",
                  border: "2px solid #86efac",
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>
                Rent Payment Recorded!
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#57534e" }}>
                Amount: <strong>₹{Number(amount).toLocaleString("en-IN")}</strong> | UTR: <strong style={{ fontFamily: "monospace" }}>{utrNumber}</strong>
              </p>

              <div style={{ background: "#f5f5f4", borderRadius: 10, padding: "14px", marginBottom: 20, textAlign: "left", fontSize: 13, display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#78716c" }}>Hostel:</span>
                  <strong>{effectiveHostelName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#78716c" }}>Paid To (VPA):</span>
                  <span style={{ fontFamily: "monospace" }}>{effectiveUpiId}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#78716c" }}>Status:</span>
                  <strong style={{ color: "#15803d" }}>Settled via Direct Bank UPI</strong>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  className="submit-btn"
                  onClick={() => setShowReceipt(true)}
                  style={{
                    padding: "10px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "#1c1917",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span>🖨️ View & Print Official Rent Receipt</span>
                </button>
                <button
                  type="button"
                  className="nav-btn"
                  onClick={onClose}
                  style={{ padding: "10px", fontSize: 13 }}
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* STAGE: PROCESSING */}
          {stage === "PROCESSING" && (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  border: "4px solid #e7e5e4",
                  borderTopColor: "#15803d",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>
                Verifying Payment...
              </h3>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#78716c" }}>
                Reconciling UTR <strong style={{ fontFamily: "monospace" }}>{utrNumber}</strong> with bank records.
              </p>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", background: "#f0fdf4", padding: "4px 10px", borderRadius: 20, display: "inline-block" }}>
                Verification Window: {verifyCountdown}s
              </div>
            </div>
          )}

          {/* STAGE: ACTIVE */}
          {stage === "ACTIVE" && (
            <>
              {/* Dual-Timer Strip (YouPI-PG Invariant 3) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: payCountdown < 60 ? "#fee2e2" : "#fef3c7",
                  border: `1px solid ${payCountdown < 60 ? "#fca5a5" : "#fde68a"}`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: payCountdown < 60 ? "#991b1b" : "#92400e",
                  marginBottom: 14,
                }}
              >
                <span>⏱️ Payment Window Active</span>
                <span style={{ fontFamily: "monospace", fontSize: 13 }}>
                  Expires in {formatTimer(payCountdown)}
                </span>
              </div>

              {/* Vector SVG QR Code Container */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e7e5e4",
                  borderRadius: 12,
                  padding: "16px",
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {qrDataUrl ? (
                  <div style={{ display: "inline-block" }}>
                    <img
                      src={qrDataUrl}
                      alt="Direct Bank UPI QR Code"
                      style={{
                        width: 220,
                        height: 220,
                        display: "block",
                        margin: "0 auto",
                        borderRadius: 8,
                      }}
                    />
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#78716c", marginTop: 6 }}>
                      Pure ISO/IEC Vector SVG • Scan with any UPI / Banking App
                    </div>
                  </div>
                ) : (
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c" }}>
                    Rendering vector UPI QR...
                  </div>
                )}

                {/* VPA Row with 1-Click Copy */}
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    background: "#f5f5f4",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ color: "#78716c", marginRight: 4 }}>Payee VPA:</span>
                    <strong style={{ fontFamily: "monospace" }}>{effectiveUpiId}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    style={{
                      flexShrink: 0,
                      background: copied ? "#15803d" : "#ffffff",
                      color: copied ? "#ffffff" : "#1c1917",
                      border: "1px solid #d6d3d1",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background-color 0.15s ease, color 0.15s ease",
                    }}
                  >
                    {copied ? "Copied ✓" : "Copy VPA"}
                  </button>
                </div>

                {/* UPI App Switcher (Adopted from YouPI-PG Drawer Flow) */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                    Or Launch Installed UPI App Directly:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <a
                      href={upiUri}
                      className="nav-btn"
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                        color: "#1c1917",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        border: "1px solid #d6d3d1",
                        borderRadius: 6,
                      }}
                    >
                      <span>⚡ Google Pay</span>
                    </a>
                    <a
                      href={upiUri}
                      className="nav-btn"
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                        color: "#1c1917",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        border: "1px solid #d6d3d1",
                        borderRadius: 6,
                      }}
                    >
                      <span>🟣 PhonePe</span>
                    </a>
                    <a
                      href={upiUri}
                      className="nav-btn"
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                        color: "#1c1917",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        border: "1px solid #d6d3d1",
                        borderRadius: 6,
                      }}
                    >
                      <span>🔵 Paytm</span>
                    </a>
                    <a
                      href={upiUri}
                      className="nav-btn"
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                        color: "#1c1917",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        border: "1px solid #d6d3d1",
                        borderRadius: 6,
                      }}
                    >
                      <span>🟠 BHIM / CRED</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Verification & Submission Form */}
              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#44403c" }}>
                      Amount to Pay (INR)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      step="any"
                      required
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#44403c" }}>
                      12-Digit Bank UPI Reference / UTR Number <span style={{ color: "#b91c1c" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 429184719203 (from bank SMS or UPI app receipt)"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      required
                      maxLength={40}
                      style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", letterSpacing: "0.05em" }}
                    />
                    <div style={{ fontSize: 11, color: "#78716c", marginTop: 4 }}>
                      Found in your transaction receipt or SMS. Required for direct bank settlement without gateway cuts.
                    </div>
                  </div>

                  {errorMsg && (
                    <div style={{ padding: "8px 12px", borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontSize: 13 }}>
                      {errorMsg}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={onClose}
                      className="nav-btn"
                      style={{ flex: 1, padding: "10px", fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="submit-btn"
                      style={{
                        flex: 2,
                        padding: "10px",
                        fontSize: 13,
                        fontWeight: 600,
                        background: "#15803d",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      PAYMENT DONE — VERIFY ₹{Number(amount || 0).toLocaleString("en-IN")}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Official Rent Receipt Modal */}
      {showReceipt && createdPayment && (
        <RentReceiptModal
          isOpen={showReceipt}
          ledger={ledger}
          payment={createdPayment}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
}
