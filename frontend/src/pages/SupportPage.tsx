import {
  FileSpreadsheet,
  HelpCircle,
  Mail,
  Mic,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const card = "p-4";

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-6 lg:p-8">
      <PageHeader
        title={t("support.title")}
        subtitle={t("support.subtitle")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* A — Getting Started */}
        <SectionCard title={t("support.gettingStarted")} icon={Rocket} bodyClassName={card}>
          <ul className="space-y-3">
            <Item title={t("support.createProducts")}>{t("support.createProductsDesc")}</Item>
            <Item title={t("support.createSalesOrders")}>{t("support.createSalesOrdersDesc")}</Item>
            <Item title={t("support.generateInvoices")}>{t("support.generateInvoicesDesc")}</Item>
            <Item title={t("support.trackInventory")}>{t("support.trackInventoryDesc")}</Item>
          </ul>
        </SectionCard>

        {/* B — AI Features */}
        <SectionCard title={t("support.aiFeatures")} icon={Sparkles} bodyClassName={card}>
          <ul className="space-y-3">
            <Item title={t("support.aiImport")}>{t("support.aiImportDesc")}</Item>
            <Item title={t("support.supportedPdf")}>{t("support.supportedPdfDesc")}</Item>
            <Item title={t("support.productMatching")}>{t("support.productMatchingDesc")}</Item>
          </ul>
        </SectionCard>

        {/* C — Voice Commands */}
        <SectionCard title={t("support.voiceCommands")} icon={Mic} bodyClassName={card}>
          <p className="mb-3 text-body-sm text-on-surface-variant">
            {t("support.voiceCommandsDesc")}
          </p>
          <div className="flex flex-wrap gap-2">
            {VOICE_COMMANDS.map((c) => (
              <span
                key={c}
                className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-body-sm font-medium text-on-surface"
              >
                "{c}"
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-on-surface-variant">
            {t("support.voiceNote")}
          </p>
        </SectionCard>

        {/* D — Excel Import */}
        <SectionCard title={t("support.excelImport")} icon={FileSpreadsheet} bodyClassName={card}>
          <ol className="space-y-3">
            <Step n={1} title={t("support.downloadTemplate")}>{t("support.downloadTemplateDesc")}</Step>
            <Step n={2} title={t("support.fillProductInfo")}>{t("support.fillProductInfoDesc")}</Step>
            <Step n={3} title={t("support.uploadExcel")}>{t("support.uploadExcelDesc")}</Step>
            <Step n={4} title={t("support.validationRules")}>{t("support.validationRulesDesc")}</Step>
          </ol>
        </SectionCard>

        {/* E — FAQ (spans full width on large screens) */}
        <SectionCard
          title={t("support.faq")}
          icon={HelpCircle}
          bodyClassName={card}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Faq q={t("support.faqStockInsufficient")} a={t("support.faqStockInsufficientAns")} />
            <Faq q={t("support.faqInvoiceDownload")} a={t("support.faqInvoiceDownloadAns")} />
            <Faq q={t("support.faqVoiceDisable")} a={t("support.faqVoiceDisableAns")} />
            <Faq q={t("support.faqImportOverwrite")} a={t("support.faqImportOverwriteAns")} />
          </div>
        </SectionCard>

        {/* F — Contact */}
        <SectionCard
          title={t("support.contactInfo")}
          icon={Mail}
          bodyClassName={card}
          className="lg:col-span-2"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary-container p-2 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[12px] uppercase text-on-surface-variant">{t("support.email")}</p>
                <a
                  href="mailto:support@minierp.demo"
                  className="text-body-md font-semibold text-primary hover:underline"
                >
                  support@minierp.demo
                </a>
              </div>
            </div>
            <div>
              <p className="text-[12px] uppercase text-on-surface-variant">{t("support.supportHours")}</p>
              <p className="text-body-md font-semibold text-on-surface">{t("support.supportHoursValue")}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
