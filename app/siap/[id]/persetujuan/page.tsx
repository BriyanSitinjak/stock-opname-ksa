import { SessionIdPage } from "@/app/siap/session-id";
import { PersetujuanBoard } from "./board";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <PersetujuanBoard id={id} />}</SessionIdPage>;
}
