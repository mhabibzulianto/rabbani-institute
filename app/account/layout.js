import BodyClassName from "@/components/BodyClassName";

export default function AccountLayout({ children }) {
  return (
    <>
      <BodyClassName className="account-mode" />
      {children}
    </>
  );
}
