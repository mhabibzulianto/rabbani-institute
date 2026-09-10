import { redirect } from "next/navigation";

export default async function EditorialRegisterRedirect() {
  redirect("/auth");
}
