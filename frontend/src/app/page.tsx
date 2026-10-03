import OrderCard from "@/components/order-card";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">FlowOps</h1>
      <p className="text-zinc-600">Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic nam quia natus odio blanditiis omnis corrupti id delectus adipisci at optio minima nulla, modi saepe, provident impedit reprehenderit quam quaerat?</p>

      <div className="space-y-4">
        <OrderCard id="A-1001" status="Selesai" description="Test"/>
        <OrderCard id="A-1002" status="Selesai" description="Test"/>
        <OrderCard id="A-1003" status="Perlu ditinjau" description="Test"/>
      </div>
    </main>
  );
}
