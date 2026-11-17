import { SessionIdPage } from "@/app/siap/session-id";
import { TugasBoard } from "./board";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <TugasBoard id={id} />}</SessionIdPage>;
}
