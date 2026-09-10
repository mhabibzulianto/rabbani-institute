import { refreshAdminPaymentStatus, refreshMyPaymentStatus } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function PaymentSyncForm({
  orderId,
  returnPath,
  courseSlug = "",
  admin = false,
  mode = "site",
  label = "Sinkronkan status",
  className = "",
  variant = "outline",
  size = "sm",
}) {
  const action = admin ? refreshAdminPaymentStatus : refreshMyPaymentStatus;

  return (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      {courseSlug ? <input type="hidden" name="courseSlug" value={courseSlug} /> : null}
      {mode === "studio" ? (
        <Button className={className} size={size} type="submit" variant={variant}>
          {label}
        </Button>
      ) : (
        <button className={className || "button ghost"} type="submit">
          {label}
        </button>
      )}
    </form>
  );
}
