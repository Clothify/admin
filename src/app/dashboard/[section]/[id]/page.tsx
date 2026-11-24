import { notFound } from "next/navigation";
import AccountWorkspace from "../../AccountWorkspace";

export default async function AccountPage({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  if ((section !== "users" && section !== "merchants" && section !== "riders") || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    notFound();
  }
  return <AccountWorkspace key={section + "/" + id} directory={section} id={id} />;
}
