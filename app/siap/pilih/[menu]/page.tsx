import { AwaitParams } from "@/app/siap/session-id";
import { SessionPick } from "./pick";

export default function Page({ params }: { params: Promise<{ menu: string }> }) {
  return <AwaitParams params={params}>{(value) => <SessionPick menu={value.menu} />}</AwaitParams>;
}
