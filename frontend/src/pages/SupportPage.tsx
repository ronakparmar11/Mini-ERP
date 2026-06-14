import {
  FileSpreadsheet,
  HelpCircle,
  Mail,
  Mic,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";

/** A titled bullet with a short description, reused across the guide cards. */
function Item({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="text-body-md font-semibold text-on-surface">{title}</span>
      <span className="text-body-sm text-on-surface-variant">{children}</span>
    </li>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-body-md font-semibold text-on-surface">{q}</p>
      <p className="mt-0.5 text-body-sm text-on-surface-variant">{a}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[12px] font-bold text-primary">
        {n}
      </span>
      <span>
        <span className="text-body-md font-semibold text-on-surface">{title}</span>
        <span className="block text-body-sm text-on-surface-variant">{children}</span>
      </span>
    </li>
  );
}

const VOICE_COMMANDS = [
  "Open Dashboard",
  "Open Products",
  "Open Inventory",
  "Create Product",
  "Create Sales Order",
];

/** Static, no-backend Support Center. */
export function SupportPage() {
  const card = "p-4";
  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Support Center"
        subtitle="Guides, AI features, voice commands, and answers to common questions."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* A — Getting Started */}
        <SectionCard title="Getting Started" icon={Rocket} bodyClassName={card}>
          <ul className="space-y-3">
            <Item title="Create Products">
              Add items from the Products page, or bulk-import them from Excel.
            </Item>
            <Item title="Create Sales Orders">
              Capture customer demand; confirming reserves available stock.
            </Item>
            <Item title="Generate Invoices">
              Once an order is delivered, generate and email its invoice.
            </Item>
            <Item title="Track Inventory">
              Every reservation, receipt, production, and delivery is logged in the ledger.
            </Item>
          </ul>
        </SectionCard>

        {/* B — AI Features */}
        <SectionCard title="AI Features" icon={Sparkles} bodyClassName={card}>
          <ul className="space-y-3">
            <Item title="AI-Assisted Sales Order Import">
              Upload a customer PDF and the assistant pre-fills a draft order for your review.
            </Item>
            <Item title="Supported PDF formats">
              Text-based PDFs (purchase orders, emails, quotes). Scanned images aren't read.
            </Item>
            <Item title="How product matching works">
              Extracted item names are matched to your catalogue (exact → partial → keyword).
              Unmatched items are left blank for you to pick.
            </Item>
          </ul>
        </SectionCard>

        {/* C — Voice Commands */}
        <SectionCard title="Voice Commands" icon={Mic} bodyClassName={card}>
          <p className="mb-3 text-body-sm text-on-surface-variant">
            Click the floating microphone button and say a command:
          </p>
          <div className="flex flex-wrap gap-2">
            {VOICE_COMMANDS.map((c) => (
              <span
                key={c}
                className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-body-sm font-medium text-on-surface"
              >
                “{c}”
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-on-surface-variant">
            Natural phrasing works too (e.g. “go to inventory”). Voice is optional — simply
            don't use it, or use an unsupported browser, and the app works normally.
          </p>
        </SectionCard>

        {/* D — Excel Import */}
        <SectionCard title="Excel Import" icon={FileSpreadsheet} bodyClassName={card}>
          <ol className="space-y-3">
            <Step n={1} title="Download Template">
              Get the sample .xlsx with the required columns and example rows.
            </Step>
            <Step n={2} title="Fill Product Information">
              Name, Sales Price, Cost Price, Procurement Route, Procure On Demand, Vendor ID.
            </Step>
            <Step n={3} title="Upload Excel">
              Upload your file and click Validate to preview the results.
            </Step>
            <Step n={4} title="Validation Rules">
              Names are required; prices must be numeric ≥ 0; route is Purchase/Manufacture;
              duplicates and invalid rows are skipped — only valid rows are imported.
            </Step>
          </ol>
        </SectionCard>

        {/* E — FAQ (spans full width on large screens) */}
        <SectionCard title="Frequently Asked Questions" icon={HelpCircle} bodyClassName={card} className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Faq
              q="What happens if stock is insufficient?"
              a="Procurement (Purchase) or Manufacturing workflows are triggered automatically for the shortage."
            />
            <Faq q="Can invoices be downloaded?" a="Yes — every invoice can be downloaded as a PDF, and optionally emailed." />
            <Faq q="Can voice navigation be disabled?" a="Yes — it's entirely optional; just don't use the microphone button." />
            <Faq q="Are existing products overwritten on import?" a="No — products that already exist are flagged as duplicates and skipped." />
          </div>
        </SectionCard>

        {/* F — Contact */}
        <SectionCard title="Contact Information" icon={Mail} bodyClassName={card} className="lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary-container p-2 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[12px] uppercase text-on-surface-variant">Email</p>
                <a href="mailto:support@minierp.demo" className="text-body-md font-semibold text-primary hover:underline">
                  support@minierp.demo
                </a>
              </div>
            </div>
            <div>
              <p className="text-[12px] uppercase text-on-surface-variant">Support Hours</p>
              <p className="text-body-md font-semibold text-on-surface">Mon–Fri, 9 AM – 6 PM</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
