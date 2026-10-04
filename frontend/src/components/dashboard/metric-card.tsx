import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, TriangleAlert, UserRoundX, type LucideIcon } from "lucide-react";

import type { DashboardMetric, MetricTone } from "@/lib/demo/dashboard";

const toneStyles: Record<
  MetricTone,
  { icon: LucideIcon; iconBox: string; value: string; tag: string }
> = {
  default: {
    icon: TriangleAlert,
    iconBox:
      "bg-secondary-container text-primary group-hover:bg-primary group-hover:text-on-primary",
    value: "text-on-surface group-hover:text-primary",
    tag: "",
  },
  critical: {
    icon: CircleAlert,
    iconBox: "bg-error-container/60 text-error",
    value: "text-error",
    tag: "bg-error-container text-on-error-container",
  },
  attention: {
    icon: UserRoundX,
    iconBox: "bg-tertiary-fixed/60 text-tertiary",
    value: "text-on-surface",
    tag: "bg-tertiary-fixed text-on-tertiary-fixed",
  },
  done: {
    icon: CircleCheck,
    iconBox: "bg-surface-container text-on-surface-variant",
    value: "text-on-surface",
    tag: "bg-surface-container-high text-on-surface",
  },
};

export default function MetricCard({ metric }: { metric: DashboardMetric }) {
  const style = toneStyles[metric.tone];
  const Icon = style.icon;

  const body = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-label-md text-label-md tracking-wider text-secondary uppercase">
              {metric.label}
            </span>
            {metric.tag && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-sm text-label-sm ${style.tag}`}
              >
                {metric.tone === "critical" && (
                  <span className="size-1.5 rounded-full bg-error motion-safe:animate-ping" aria-hidden />
                )}
                {metric.tag}
              </span>
            )}
          </div>
          <span
            className={`mt-1 font-headline-xl text-headline-xl font-numeric-table transition-colors ${style.value}`}
          >
            {metric.value}
          </span>
        </div>
        <div
          className={`flex size-10 items-center justify-center rounded-xl transition-colors ${style.iconBox}`}
        >
          <Icon className="size-5.5" aria-hidden />
        </div>
      </div>

      <div className="-mx-5 mt-4 -mb-5 flex flex-wrap items-center justify-between gap-x-2 rounded-b-xl bg-surface-container-low/50 px-5 py-3 text-secondary">
        <span className="font-body-sm text-body-sm">{metric.footer}</span>
        {metric.linksToQueue ? (
          <ArrowRight
            className="size-4 text-outline transition-transform group-hover:translate-x-1"
            aria-hidden
          />
        ) : (
          metric.footerAside && (
            <span className="font-numeric-table text-label-sm font-medium">{metric.footerAside}</span>
          )
        )}
      </div>
    </>
  );

  const cardClass =
    "group flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-all duration-200";

  return metric.linksToQueue ? (
    <Link href="/antrean" className={`${cardClass} hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cardClass}>{body}</div>
  );
}
