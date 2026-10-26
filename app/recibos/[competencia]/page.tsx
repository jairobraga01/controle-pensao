import { redirect } from "next/navigation";

export default async function ReciboDoMes({ params }: { params: Promise<{ competencia: string }> }) {
  const { competencia } = await params;
  redirect(`/recibos/${competencia}/judicial`);
}
