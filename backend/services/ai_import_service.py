"""AiImportService — AI-assisted customer-order import.

Pipeline:
    PDF bytes → text (pypdf) → Groq LLM (strict JSON) → normalize/merge →
    fuzzy-match product names to the catalogue → ImportedOrder (for human review).

This service NEVER creates, confirms, or auto-procures anything. It only returns
extracted data; the user reviews/edits it and the existing POST /sales-orders
endpoint creates the DRAFT order.
"""
from __future__ import annotations

import io
import json

import httpx
from sqlalchemy.orm import Session

from models.product import Product
from schemas.ai_import import ImportedItem, ImportedOrder
from utils.config import settings
from utils.exceptions import BusinessRuleError, ValidationError

_SYSTEM_PROMPT = (
    "You extract customer purchase orders from raw document text and return "
    "STRICT JSON only. Schema:\n"
    '{"customer_name": string|null, "email": string|null, "address": string|null, '
    '"items": [{"product_name": string, "quantity": number}]}\n'
    "Rules:\n"
    "- Return ALL ordered products mentioned in the document.\n"
    "- If a quantity is missing, use 1.\n"
    "- If the same product appears more than once, merge by summing quantities.\n"
    "- IGNORE prices, totals, taxes, discounts, signatures, bank details, "
    "invoice/PO numbers, terms & conditions, page numbers, and any salesperson.\n"
    "- product_name must be the human product name only (no quantities/prices).\n"
    "- Respond with JSON only — no prose, no markdown."
)


class AiImportService:
    def __init__(self, db: Session):
        self.db = db

    # ---- public entry point ----
    def extract_order_from_pdf(self, content: bytes, filename: str | None = None) -> ImportedOrder:
        text = self._extract_text(content)
        if not text.strip():
            raise ValidationError(
                "No readable text found in the PDF (it may be a scanned image)."
            )
        raw = self._call_groq(text)
        return self._normalize_and_match(raw)

    # ---- steps (kept separable for testing) ----
    def _extract_text(self, content: bytes) -> str:
        from pypdf import PdfReader  # local import keeps service import-light
        try:
            reader = PdfReader(io.BytesIO(content))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception as exc:  # malformed / non-PDF upload
            raise ValidationError(f"Could not read the PDF: {exc}") from exc

    def _call_groq(self, text: str) -> dict:
        api_key = settings.groq_api_key
        if not api_key:
            raise BusinessRuleError(
                "AI import is not configured. Set groq_api_key in the backend .env."
            )
        # Cap the payload so a huge PDF can't blow the context window.
        snippet = text[:12000]
        try:
            resp = httpx.post(
                f"{settings.GROQ_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": f"Document text:\n\n{snippet}"},
                    ],
                },
                timeout=45.0,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            raise BusinessRuleError(
                "AI extraction failed. Please try again or enter the order manually."
            ) from exc

    def _normalize_and_match(self, raw: dict) -> ImportedOrder:
        products = self.db.query(Product).all()

        # Merge duplicate product names (case-insensitive), summing quantities.
        merged: dict[str, list] = {}  # key -> [display_name, quantity]
        for item in raw.get("items") or []:
            name = str(item.get("product_name") or "").strip()
            if not name:
                continue
            try:
                qty = float(item.get("quantity"))
            except (TypeError, ValueError):
                qty = 1.0
            if qty <= 0:
                qty = 1.0
            key = name.lower()
            if key in merged:
                merged[key][1] += qty
            else:
                merged[key] = [name, qty]

        items: list[ImportedItem] = []
        for name, qty in merged.values():
            match = self._match_product(name, products)
            items.append(ImportedItem(
                product_name=name,
                quantity=qty,
                matched_product_id=match.id if match else None,
                matched_product_name=match.name if match else None,
            ))

        return ImportedOrder(
            customer_name=(raw.get("customer_name") or None),
            email=(raw.get("email") or None),
            address=(raw.get("address") or None),
            items=items,
        )

    @staticmethod
    def _match_product(name: str, products: list[Product]) -> Product | None:
        n = name.strip().lower()
        if not n:
            return None
        # 1) exact (case-insensitive)
        for p in products:
            if p.name.strip().lower() == n:
                return p
        # 2) substring either direction
        for p in products:
            pn = p.name.strip().lower()
            if n in pn or pn in n:
                return p
        # 3) best token overlap
        n_tokens = set(n.split())
        best, best_score = None, 0
        for p in products:
            score = len(n_tokens & set(p.name.lower().split()))
            if score > best_score:
                best, best_score = p, score
        return best if best_score > 0 else None
