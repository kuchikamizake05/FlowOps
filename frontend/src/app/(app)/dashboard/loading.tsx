import { MetricSkeleton, QueueSkeleton } from "@/components/states";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-space-lg">
      <MetricSkeleton />
      <QueueSkeleton />
    </div>
  );
}
