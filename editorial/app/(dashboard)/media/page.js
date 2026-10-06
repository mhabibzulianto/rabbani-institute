import MediaPanel from "@/components/MediaPanel";
import { requireEditorialUser } from "@/lib/editorial";

export default async function MediaPage() {
  const { profile } = await requireEditorialUser();
  return <div className="media-workspace"><div className="page-heading"><p className="eyebrow">KONTEN</p><h1>Media</h1><p>{profile.role === "admin" ? "Pustaka media seluruh penulis." : "Pustaka media yang Anda unggah."} Gunakan kembali file sebagai cover atau isi artikel.</p></div><MediaPanel browseOnly /></div>;
}
