import crypto from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { markStudyPlanCourseConverted } from "@/lib/study-plans";

const DEFAULT_PRICING = {
  "bahasa-arab-dasar": 149000,
  "pengantar-ulumul-quran": 129000,
};

function cleanEnv(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getMidtransEnv() {
  const serverKey = cleanEnv(process.env.MIDTRANS_SERVER_KEY);
  const clientKey = cleanEnv(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);
  const isProduction = cleanEnv(process.env.MIDTRANS_IS_PRODUCTION).toLowerCase() === "true";
  const siteUrl =
    cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) ||
    (cleanEnv(process.env.VERCEL_URL) ? `https://${cleanEnv(process.env.VERCEL_URL)}` : "");

  return {
    serverKey,
    clientKey,
    isProduction,
    siteUrl,
    snapBaseUrl: isProduction ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com",
    apiBaseUrl: isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com",
  };
}

export function hasMidtransServerKey() {
  return Boolean(getMidtransEnv().serverKey);
}

export function resolveCoursePrice(course) {
  const directPrice = Number(course?.price_idr || 0);

  if (Number.isFinite(directPrice) && directPrice > 0) {
    return directPrice;
  }

  return DEFAULT_PRICING[course?.slug] || 0;
}

export function getCourseCheckoutMode(course, options = {}) {
  if (course?.status === "beta" && options.isBetaTester) {
    return "free";
  }

  return resolveCoursePrice(course) > 0 ? "paid" : "free";
}

export function buildOrderId({ courseId, userId }) {
  const userHash = crypto.createHash("sha1").update(userId).digest("hex").slice(0, 12);
  const stamp = Date.now().toString(36);
  return `rbn-${courseId}-${userHash}-${stamp}`;
}

export function parseOrderId(orderId) {
  const match = /^rbn-(\d+)-([a-f0-9]{12})-([a-z0-9]+)$/i.exec(orderId || "");

  if (!match) {
    return null;
  }

  return {
    courseId: Number.parseInt(match[1], 10),
    userHash: match[2],
  };
}

export function doesOrderBelongToUser(orderId, userId) {
  const parsed = parseOrderId(orderId);

  if (!parsed) {
    return false;
  }

  const expectedHash = crypto.createHash("sha1").update(userId).digest("hex").slice(0, 12);
  return parsed.userHash === expectedHash;
}

function createBasicAuthHeader(serverKey) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export async function createMidtransSnapTransaction({ orderId, amount, course, user }) {
  const env = getMidtransEnv();

  if (!env.serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  }

  if (!env.siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL belum dikonfigurasi.");
  }

  const siteBase = env.siteUrl.replace(/\/$/, "");
  const body = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    item_details: [
      {
        id: String(course.id),
        price: amount,
        quantity: 1,
        name: course.title_id?.slice(0, 50) || "Kelas Rabbani Institute",
      },
    ],
    customer_details: {
      first_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Peserta",
      email: user.email,
    },
    callbacks: {
      finish: `${siteBase}/payments/finish?order_id=${encodeURIComponent(orderId)}&course=${encodeURIComponent(course.slug)}`,
      error: `${siteBase}/payments/error?order_id=${encodeURIComponent(orderId)}&course=${encodeURIComponent(course.slug)}`,
      pending: `${siteBase}/payments/unfinish?order_id=${encodeURIComponent(orderId)}&course=${encodeURIComponent(course.slug)}`,
    },
    custom_field1: String(course.id),
    custom_field2: user.id,
    custom_field3: course.slug,
    expiry: {
      unit: "hours",
      duration: 24,
    },
  };

  const response = await fetch(`${env.snapBaseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: createBasicAuthHeader(env.serverKey),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.status_message || payload?.error_messages?.join(", ") || "Gagal membuat transaksi Midtrans.");
  }

  return payload;
}

export async function getMidtransTransactionStatus(orderId) {
  const env = getMidtransEnv();

  if (!env.serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  }

  const response = await fetch(`${env.apiBaseUrl}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: {
      Accept: "application/json",
      Authorization: createBasicAuthHeader(env.serverKey),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.status_message || "Gagal mengambil status transaksi Midtrans.");
  }

  return payload;
}

export function verifyMidtransSignature(payload) {
  const env = getMidtransEnv();

  if (!env.serverKey) {
    return false;
  }

  const signature = crypto
    .createHash("sha512")
    .update(`${payload?.order_id || ""}${payload?.status_code || ""}${payload?.gross_amount || ""}${env.serverKey}`)
    .digest("hex");

  return signature === payload?.signature_key;
}

export function isMidtransPaymentSuccessful(status, fraudStatus) {
  if (status === "settlement") {
    return true;
  }

  if (status === "capture") {
    return !fraudStatus || fraudStatus === "accept";
  }

  return false;
}

export function isMidtransPaymentPending(status) {
  return ["pending", "authorize"].includes(status);
}

export function isMidtransPaymentFailed(status) {
  return ["deny", "cancel", "expire", "failure"].includes(status);
}

export async function persistPaymentRecord(record, { asAdmin = false } = {}) {
  const supabase = asAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  let mergedRecord = { ...record };
  const { data: existingRecord, error: existingError } = await supabase
    .from("payment_transactions")
    .select("order_id, student_id, snap_token, snap_redirect_url, raw_payload")
    .eq("order_id", record.order_id)
    .maybeSingle();

  if (existingError && !isMissingPaymentTable(existingError)) {
    console.error(existingError);
  }

  if (existingRecord) {
    mergedRecord = {
      ...existingRecord,
      ...record,
      student_id: record.student_id || existingRecord.student_id || null,
      snap_token: record.snap_token || existingRecord.snap_token || null,
      snap_redirect_url: record.snap_redirect_url || existingRecord.snap_redirect_url || null,
      raw_payload: record.raw_payload || existingRecord.raw_payload || null,
    };
  }

  const { error } = await supabase.from("payment_transactions").upsert(mergedRecord, {
    onConflict: "order_id",
  });

  if (error) {
    if (isMissingPaymentTable(error)) {
      return false;
    }

    console.error(error);
    return false;
  }

  return true;
}

async function getCourseForPaymentRecord(supabase, courseId) {
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title_id, price_idr, status")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

async function findStudentIdForOrder(orderId, { knownStudentId = null, adminClient }) {
  if (knownStudentId && doesOrderBelongToUser(orderId, knownStudentId)) {
    return knownStudentId;
  }

  const { data: existingRecord, error: existingRecordError } = await adminClient
    .from("payment_transactions")
    .select("student_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingRecordError && !isMissingPaymentTable(existingRecordError)) {
    console.error(existingRecordError);
  }

  if (existingRecord?.student_id && doesOrderBelongToUser(orderId, existingRecord.student_id)) {
    return existingRecord.student_id;
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id");

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const match = (profiles || []).find((item) => doesOrderBelongToUser(orderId, item.id));
  return match?.id || null;
}

async function activateEnrollment({ supabase, courseId, userId }) {
  const { error } = await supabase.from("enrollments").upsert(
    {
      course_id: courseId,
      student_id: userId,
      status: "active",
    },
    { onConflict: "student_id,course_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function syncMidtransTransactionStatus({ orderId, userId = null, asAdmin = false }) {
  const statusPayload = await getMidtransTransactionStatus(orderId);
  const parsed = parseOrderId(orderId);

  if (!parsed || parsed.courseId < 1) {
    throw new Error("Order ID pembayaran tidak valid.");
  }

  if (!asAdmin && (!userId || !doesOrderBelongToUser(orderId, userId))) {
    throw new Error("Order pembayaran tidak cocok dengan akun aktif.");
  }

  const supabase = asAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase admin client belum dikonfigurasi.");
  }

  const course = await getCourseForPaymentRecord(supabase, parsed.courseId);
  const studentId = asAdmin
    ? await findStudentIdForOrder(orderId, {
        knownStudentId: userId,
        adminClient: supabase,
      })
    : userId;

  await persistPaymentRecord({
    order_id: orderId,
    course_id: parsed.courseId,
    student_id: studentId,
    amount_idr: Number.parseInt(statusPayload?.gross_amount || "0", 10) || resolveCoursePrice(course),
    snap_token: statusPayload?.transaction_id || null,
    snap_redirect_url: null,
    transaction_status: statusPayload?.transaction_status || "unknown",
    payment_type: statusPayload?.payment_type || null,
    status_code: statusPayload?.status_code || null,
    fraud_status: statusPayload?.fraud_status || null,
    raw_payload: statusPayload,
    paid_at: statusPayload?.settlement_time || null,
  }, { asAdmin });

  if (studentId && isMidtransPaymentSuccessful(statusPayload?.transaction_status, statusPayload?.fraud_status)) {
    await activateEnrollment({
      supabase,
      courseId: parsed.courseId,
      userId: studentId,
    });
    await markStudyPlanCourseConverted({
      userId: studentId,
      courseId: parsed.courseId,
      orderId,
      asAdmin,
    });
  }

  return {
    course,
    statusPayload,
    studentId,
  };
}

export async function finalizePaidEnrollment({ orderId, userId }) {
  return syncMidtransTransactionStatus({
    orderId,
    userId,
  });
}

function isMissingPaymentTable(error) {
  const message = error?.message || "";
  return (/payment_transactions/i.test(message) && /does not exist/i.test(message))
    || /Could not find the 'payment_transactions' relation/i.test(message)
    || /Could not find .*payment_transactions.*schema cache/i.test(message);
}
