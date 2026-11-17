import { SessionIdPage } from "@/app/siap/session-id";
import { SesiDetail } from "./detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <SesiDetail id={id} />}</SessionIdPage>;
}
