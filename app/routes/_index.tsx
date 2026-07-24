import type { Route } from "./+types/_index";
import { redirect } from "react-router";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return redirect(`/app${url.search}`);
}

export default function Index() {
  return null;
}
