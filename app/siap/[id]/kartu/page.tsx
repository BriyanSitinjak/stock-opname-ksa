import { SessionIdPage } from "@/app/siap/session-id";
import { KartuBoard } from "./board";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <KartuBoard id={id} />}</SessionIdPage>;
}
