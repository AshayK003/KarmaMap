# ADR-001: Manual Invoicing Before Payment Processor Integration

**Date:** 2026-05-25
**Status:** Accepted

## Context

KarmaMap needs payment processing to enable monetization features (featured gigs, corporate dashboard). The two primary options are Stripe (global) and PayU (India). However, no product has been validated with paying customers yet.

Building Stripe/PayU integration carries integration complexity, security risk (webhook verification, secret key management), and ongoing maintenance burden. It is premature to invest in payment infrastructure before validating willingness to pay.

## Decision

Start with **manual invoicing** — a `payments` table to track payment lifecycle + backend endpoints for NGOs to create and self-confirm payment requests. No payment processor integration. For the MVP, confirmation is trust-based: the NGO creates a payment request, pays via invoice (external), then self-confirms on the platform.

## Alternatives Considered

| Approach | Pros | Cons |
|---|---|---|
| **Manual invoicing (chosen)** | No integration cost, validates demand, zero PCI scope, 1 day build | Trust-based, doesn't scale, no automatic verification |
| **Stripe Checkout** | Fully automated, PCI-compliant, global | 3-5 days build, requires Stripe account, webhook infrastructure |
| **Stripe + PayU** | Covers India + global | 1-2 weeks, dual webhooks, higher maintenance |
| **No payments** | Zero cost | Cannot validate revenue hypothesis |

## Consequences

- **Positive:** Payment infrastructure is built (table, routes, service) and ready for Stripe webhook integration later. The `payments` table schema maps directly to Stripe's `checkout.session.completed` event.
- **Positive:** Can validate willingness-to-pay by testing with real NGOs using invoices before investing in payment processor integration.
- **Negative:** Trust-based confirmation means NGOs can self-confirm without paying. Acceptable for MVP — admin has visibility into payment records and can audit.
- **Negative:** Manual invoicing requires human intervention to send invoices and follow up. Not scalable beyond a handful of NGOs.
- **Tradeoff accepted:** No automatic verification — the `confirmPayment` endpoint checks payment ownership and pending status but doesn't verify actual payment receipt.

## Implementation

- One new migration: `09_payments.sql` (payment_status enum + payments table + RLS + indexes)
- Three new backend files: `paymentService.ts`, `paymentController.ts`, `routes/payments.ts`
- Modified: `index.ts` (mount payment routes)
- File changes: `services/__tests__/paymentService.test.ts`, `src/__tests__/api.test.ts`
- No frontend changes in this ADR

## Related

- Migration: `supabase/migrations/09_payments.sql`
- Service: `backend/services/paymentService.ts`
- Controller: `backend/controllers/paymentController.ts`
- Routes: `backend/routes/payments.ts`
