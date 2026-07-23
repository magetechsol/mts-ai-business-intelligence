import type { Route } from "./+types/_index";
import { redirect } from "react-router";

export function loader() {
  return redirect("/app");
}

export default function Index() {
  return null;
}
