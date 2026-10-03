type OrderCardProps = {
    id: string;
    status: "Perlu ditinjau" | "Selesai";
    description: string;
}

export default function OrderCard({ id, status, description }: OrderCardProps) {
    return(
        <div className="rounded-lg border border-zinc-200 p-4">
            <div>{id}</div>
            <div>{status}</div>
            <div>{description}</div>
        </div>
    )
}
