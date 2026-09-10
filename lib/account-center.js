import { canAuthorArticles } from "@/lib/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ACCOUNT_APPS = [
  {
    slug: "madrasah",
    title: "Madrasah",
    description: "Dashboard pembelajaran utama untuk siswa, instruktur, dan guru.",
    href: process.env.NEXT_PUBLIC_MADRASAH_URL || "https://madrasah.rabbaniinstitute.id",
  },
  {
    slug: "editorial",
    title: "Editorial",
    description: "Panel khusus penulis untuk mengelola artikel, media, dan pembaca.",
    href: process.env.NEXT_PUBLIC_EDITORIAL_URL || "https://editorial.rabbaniinstitute.id",
  },
  {
    slug: "store",
    title: "Store",
    description: "Pembelian buku, produk digital, dan riwayat order.",
    href: process.env.NEXT_PUBLIC_STORE_URL || "https://store.rabbaniinstitute.id",
  },
  {
    slug: "osban",
    title: "Osban",
    description: "Akses aplikasi pendamping Osban dengan akun Rabbani yang sama.",
    href: process.env.NEXT_PUBLIC_OSBAN_URL || "https://osban.rabbaniinstitute.id",
  },
];

const DEFAULT_NOTIFICATION_PREFERENCES = {
  email_learning_updates: true,
  email_payment_updates: true,
  email_security_alerts: true,
  whatsapp_learning_updates: false,
  whatsapp_payment_updates: true,
  whatsapp_security_alerts: true,
};

function isMissingRelation(error, relationName) {
  const message = error?.message || "";
  return (
    (relationName && new RegExp(relationName, "i").test(message) && /does not exist/i.test(message))
    || /Could not find .*schema cache/i.test(message)
    || error?.code === "42P01"
  );
}

function getRoleLabel(profile) {
  if (profile?.role === "admin") return "Admin";
  if (profile?.role === "instructor") return "Instructor";
  return "Student";
}

export async function getCampusUsageSummary(userId, profile) {
  const supabase = await createSupabaseServerClient();
  const [enrollmentsResult, paymentsResult, articlesResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId),
    supabase
      .from("payment_transactions")
      .select("order_id, transaction_status, amount_idr, payment_type, paid_at, created_at, course:courses(slug, title_id)", { count: "exact" })
      .eq("student_id", userId)
      .order("created_at", { ascending: false }),
    canAuthorArticles(profile)
      ? supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("author_id", userId)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  return {
    enrollmentsCount: enrollmentsResult.error ? 0 : (enrollmentsResult.count || 0),
    payments: paymentsResult.error ? [] : (paymentsResult.data || []),
    articlesCount: articlesResult.error ? 0 : (articlesResult.count || 0),
  };
}

export async function getAccountAppMemberships(userId, profile) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("account_app_memberships")
    .select("app_slug, activated_at, last_seen_at")
    .eq("user_id", userId);

  const records = new Map();

  if (!error) {
    for (const item of data || []) {
      records.set(item.app_slug, item);
    }
  }

  const campus = await getCampusUsageSummary(userId, profile);
  const hasMadrasahFootprint =
    profile?.role === "admin"
    || profile?.role === "instructor"
    || Boolean(profile?.is_writer)
    || campus.enrollmentsCount > 0
    || campus.payments.length > 0
    || campus.articlesCount > 0;

  return ACCOUNT_APPS.map((app) => {
    const membership = records.get(app.slug);
    const isActive = Boolean(membership)
      || (app.slug === "madrasah" && hasMadrasahFootprint)
      || (app.slug === "editorial" && Boolean(profile?.is_writer));

    return {
      ...app,
      status: isActive ? "active" : "inactive",
      activatedAt: membership?.activated_at || null,
      lastSeenAt: membership?.last_seen_at || null,
    };
  });
}

export async function getAccountAddresses(userId) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("account_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error && !isMissingRelation(error, "account_addresses")) {
    throw error;
  }

  return error ? [] : (data || []);
}

export async function getNotificationPreferences(userId) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("account_notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && !isMissingRelation(error, "account_notification_preferences")) {
    throw error;
  }

  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(data || {}),
  };
}

export async function touchAccountAppMembership(appSlug, userId) {
  if (!userId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    user_id: userId,
    app_slug: appSlug,
    last_seen_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("account_app_memberships")
    .upsert(payload, { onConflict: "user_id,app_slug" });

  if (error && !isMissingRelation(error, "account_app_memberships")) {
    console.error(error);
  }
}

export async function getAccountSummary(user, profile) {
  if (!user?.id) {
    return {
      roleLabel: getRoleLabel(profile),
      memberships: ACCOUNT_APPS.map((app) => ({
        ...app,
        status: "inactive",
        activatedAt: null,
        lastSeenAt: null,
      })),
      addresses: [],
      notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      payments: [],
      stats: {
        activeApps: 0,
        addresses: 0,
        payments: 0,
        enrollments: 0,
        articles: 0,
      },
    };
  }

  const [memberships, addresses, notifications, campus] = await Promise.all([
    getAccountAppMemberships(user.id, profile),
    getAccountAddresses(user.id),
    getNotificationPreferences(user.id),
    getCampusUsageSummary(user.id, profile),
  ]);

  return {
    roleLabel: getRoleLabel(profile),
    memberships,
    addresses,
    notifications,
    payments: campus.payments,
    stats: {
      activeApps: memberships.filter((item) => item.status === "active").length,
      addresses: addresses.length,
      payments: campus.payments.length,
      enrollments: campus.enrollmentsCount,
      articles: campus.articlesCount,
    },
  };
}
