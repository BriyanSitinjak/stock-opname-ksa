import { SessionIdPage } from "@/app/siap/session-id";
import { ImporForm } from "./form";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <ImporForm id={id} />}</SessionIdPage>;
}
