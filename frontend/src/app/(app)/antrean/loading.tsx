import { QueueSkeleton } from "@/components/states";

export default function QueueLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-space-lg">
      <QueueSkeleton />
    </div>
  );
}
