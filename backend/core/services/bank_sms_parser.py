"""
Bank and UPI SMS / Notification Parser (Adopted from YouPI-PG V2).
Parses incoming bank SMS alerts & UPI app push notifications from Indian banks:
SBI, HDFC, ICICI, Axis, Kotak, PNB, Bank of Baroda, Paytm Payments Bank, PhonePe, Google Pay, etc.
Extracts:
- Credited Amount (Decimal / float)
- 12-digit Bank Reference Number / UTR / RRN
- Sender VPA (if present)
- Credit validation (filters out pure debits)
"""
import re
from decimal import Decimal


def extract_intelligent_amount(text: str):
    """
    Intelligent monetary amount extractor for Indian UPI & Bank SMS alerts.
    Handles prefixes (Rs. 6500, INR 6,500.00, ₹6500), suffixes (6500.00 Rs),
    and credit proximity keywords ("credited with 6500", "received Rs 6500").
    """
    if not text or not isinstance(text, str):
        return None

    # Pattern 1: Standard currency prefix (e.g., Rs. 6500, INR 6500.00, ₹6,500.00, Rs 500)
    prefix_match = re.search(r'(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)', text, re.IGNORECASE)
    if prefix_match:
        try:
            val = prefix_match.group(1).replace(',', '')
            dec = Decimal(val)
            if dec > 0:
                return dec
        except Exception:
            pass

    # Pattern 2: Standard currency suffix (e.g., 6500.00 Rs, 6500 inr, 6500 ₹)
    suffix_match = re.search(r'([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)', text, re.IGNORECASE)
    if suffix_match:
        try:
            val = suffix_match.group(1).replace(',', '')
            dec = Decimal(val)
            if dec > 0:
                return dec
        except Exception:
            pass

    # Pattern 3: Number adjacent to credit keywords ("credited 6500", "received 6500", "payment 6500")
    proximity_match = re.search(
        r'(?:credited|received|deposit|payment|paid|transferred|upi|cr)[\s\w:]*?([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)[\s\w:]*?(?:credited|received|deposit|payment|paid|transferred|upi|cr)',
        text,
        re.IGNORECASE,
    )
    if proximity_match:
        raw_val = proximity_match.group(1) or proximity_match.group(2)
        if raw_val:
            try:
                val = raw_val.replace(',', '')
                dec = Decimal(val)
                if 0 < dec < 10000000:
                    return dec
            except Exception:
                pass

    # Pattern 4: Standalone decimal currency number (e.g. 6500.00, 150.50)
    standalone_match = re.search(r'\b(\d{1,7}\.\d{2})\b', text)
    if standalone_match:
        try:
            dec = Decimal(standalone_match.group(1))
            if dec > 0:
                return dec
        except Exception:
            pass

    return None


def parse_bank_sms(text: str):
    """
    Parses bank credit SMS or UPI notification text into structured payment attribution data.
    Returns dict:
      {
        "amount": Decimal,
        "reference_id": str (UTR / RRN),
        "sender_vpa": str or None,
        "raw_text": str,
        "is_credit": bool
      }
    or None if text does not represent a valid credit alert.
    """
    if not text or not isinstance(text, str):
        return None

    clean_text = text.strip()

    # Credit validation check
    credit_keywords = re.search(r'(credited|received|deposit|payment received|upi/cr|transferred)', clean_text, re.IGNORECASE)
    if not credit_keywords:
        return None

    # Filter out pure debit alerts (unless explicitly credited)
    if re.search(r'(debited|withdrawn|sent rs|paid rs)', clean_text, re.IGNORECASE) and not re.search(r'(credited|received|deposit)', clean_text, re.IGNORECASE):
        return None

    # 1. Extract Amount
    amount = extract_intelligent_amount(clean_text)
    if not amount:
        return None

    # 2. Extract Bank Reference Number / UTR / RRN (12 digits or alphanumeric ref)
    ref_id = None
    ref_match = re.search(r'(?:utr|ref(?:\s*no)?|txn(?:\s*id)?|rrn)[:\s#]+([a-zA-Z0-9\-_]{6,35})', clean_text, re.IGNORECASE)
    if ref_match:
        ref_id = ref_match.group(1).strip()
    else:
        upi_cr_match = re.search(r'UPI/CR/([a-zA-Z0-9\-_]+)', clean_text, re.IGNORECASE)
        if upi_cr_match:
            ref_id = upi_cr_match.group(1).strip()
        else:
            # Standalone 12-digit standard NPCI UPI UTR
            utr_digits = re.search(r'\b(\d{12})\b', clean_text)
            if utr_digits:
                ref_id = utr_digits.group(1)

    # 3. Extract Sender VPA
    sender_vpa = None
    vpa_match = re.search(r'(?:from|by)\s+([a-zA-Z0-9.\-_]{2,100}@[a-zA-Z0-9.\-_]{2,64})', clean_text, re.IGNORECASE)
    if not vpa_match:
        vpa_match = re.search(r'([a-zA-Z0-9.\-_]{2,100}@[a-zA-Z0-9.\-_]{2,64})', clean_text, re.IGNORECASE)
    if vpa_match:
        sender_vpa = vpa_match.group(1).strip().rstrip('.,;')

    return {
        "amount": amount,
        "reference_id": ref_id or "",
        "sender_vpa": sender_vpa,
        "raw_text": clean_text,
        "is_credit": True,
    }
