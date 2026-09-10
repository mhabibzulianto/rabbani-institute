import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PLAN_STATUSES = ["active", "archived", "converted"];
const ITEM_STATUSES = ["active", "removed", "converted", "invalid"];

export function isMissingStudyPlanTableError(error) {
  const message = error?.message || "";
  return (
    /study_plans|study_plan_items/i.test(message)
    && (/does not exist/i.test(message) || /schema cache/i.test(message))
  );
}

export async function getStudyPlanForUser(userId) {
  if (!userId) {
    return { schemaReady: true, items: [], totalAmount: 0 };
  }

  const supabase = await createSupabaseServerClient();
  return fetchStudyPlanForUserWithClient(supabase, userId);
}

export async function getStudyPlanCourseIds(userId) {
  if (!userId) {
    return { schemaReady: true, courseIds: new Set() };
  }

  const plan = await getStudyPlanForUser(userId);
  return {
    schemaReady: plan.schemaReady,
    courseIds: new Set((plan.items || []).map((item) => item.course_id)),
  };
}

export async function ensureActiveStudyPlanForUser(supabase, userId) {
  const { data: existingPlan, error: existingError } = await supabase
    .from("study_plans")
    .select("id, user_id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existingError) {
    if (isMissingStudyPlanTableError(existingError)) {
      return { schemaReady: false, plan: null };
    }

    throw existingError;
  }

  if (existingPlan) {
    return { schemaReady: true, plan: existingPlan };
  }

  const { data: insertedPlan, error: insertError } = await supabase
    .from("study_plans")
    .insert({
      user_id: userId,
      status: "active",
    })
    .select("id, user_id, status")
    .single();

  if (!insertError) {
    return { schemaReady: true, plan: insertedPlan };
  }

  if (isMissingStudyPlanTableError(insertError)) {
    return { schemaReady: false, plan: null };
  }

  if (insertError.code === "23505") {
    const retry = await supabase
      .from("study_plans")
      .select("id, user_id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (retry.error) {
      throw retry.error;
    }

    return { schemaReady: true, plan: retry.data };
  }

  throw insertError;
}

export async function addCourseToStudyPlanRecord(supabase, { userId, courseId, snapshot }) {
  const ensured = await ensureActiveStudyPlanForUser(supabase, userId);

  if (!ensured.schemaReady) {
    return { schemaReady: false, result: "missing_schema" };
  }

  const { plan } = ensured;
  const { data: existingActive, error: existingError } = await supabase
    .from("study_plan_items")
    .select("id, course_id, selection_state")
    .eq("study_plan_id", plan.id)
    .eq("course_id", courseId)
    .eq("selection_state", "active")
    .maybeSingle();

  if (existingError) {
    if (isMissingStudyPlanTableError(existingError)) {
      return { schemaReady: false, result: "missing_schema" };
    }

    throw existingError;
  }

  if (existingActive) {
    return { schemaReady: true, result: "exists", item: existingActive };
  }

  const { data: existingInactive, error: inactiveError } = await supabase
    .from("study_plan_items")
    .select("id")
    .eq("study_plan_id", plan.id)
    .eq("course_id", courseId)
    .in("selection_state", ["removed", "invalid"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inactiveError && !isMissingStudyPlanTableError(inactiveError)) {
    throw inactiveError;
  }

  if (existingInactive?.id) {
    const { data: restoredItem, error: restoreError } = await supabase
      .from("study_plan_items")
      .update({
        selection_state: "active",
        snapshot_price_idr: snapshot.price_idr,
        snapshot_title: snapshot.title,
        snapshot_status: snapshot.status,
        added_at: new Date().toISOString(),
        conversion_order_id: null,
      })
      .eq("id", existingInactive.id)
      .select("*")
      .single();

    if (restoreError) {
      throw restoreError;
    }

    return { schemaReady: true, result: "restored", item: restoredItem };
  }

  const { data: insertedItem, error: insertError } = await supabase
    .from("study_plan_items")
    .insert({
      study_plan_id: plan.id,
      course_id: courseId,
      snapshot_price_idr: snapshot.price_idr,
      snapshot_title: snapshot.title,
      snapshot_status: snapshot.status,
      selection_state: "active",
    })
    .select("*")
    .single();

  if (insertError) {
    if (isMissingStudyPlanTableError(insertError)) {
      return { schemaReady: false, result: "missing_schema" };
    }

    if (insertError.code === "23505") {
      return { schemaReady: true, result: "exists", item: null };
    }

    throw insertError;
  }

  return { schemaReady: true, result: "added", item: insertedItem };
}

export async function removeStudyPlanItemRecord(supabase, { userId, itemId }) {
  const ensured = await ensureActiveStudyPlanForUser(supabase, userId);

  if (!ensured.schemaReady) {
    return { schemaReady: false, removed: false };
  }

  const { error } = await supabase
    .from("study_plan_items")
    .update({ selection_state: "removed" })
    .eq("id", itemId)
    .eq("study_plan_id", ensured.plan.id)
    .eq("selection_state", "active");

  if (error) {
    if (isMissingStudyPlanTableError(error)) {
      return { schemaReady: false, removed: false };
    }

    throw error;
  }

  return { schemaReady: true, removed: true };
}

export async function markStudyPlanCourseConverted({ userId, courseId, orderId = null, asAdmin = false }) {
  if (!userId || !courseId) {
    return false;
  }

  const supabase = asAdmin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const activePlan = await supabase
    .from("study_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (activePlan.error) {
    if (isMissingStudyPlanTableError(activePlan.error)) {
      return false;
    }

    console.error(activePlan.error);
    return false;
  }

  if (!activePlan.data?.id) {
    return false;
  }

  const { error } = await supabase
    .from("study_plan_items")
    .update({
      selection_state: "converted",
      conversion_order_id: orderId,
    })
    .eq("study_plan_id", activePlan.data.id)
    .eq("course_id", courseId)
    .eq("selection_state", "active");

  if (error) {
    if (isMissingStudyPlanTableError(error)) {
      return false;
    }

    console.error(error);
    return false;
  }

  return true;
}

export async function markStudyPlanCourseCheckoutStarted({ userId, courseId, orderId }) {
  if (!userId || !courseId || !orderId) {
    return false;
  }

  const supabase = await createSupabaseServerClient();
  const activePlan = await supabase
    .from("study_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (activePlan.error) {
    if (isMissingStudyPlanTableError(activePlan.error)) {
      return false;
    }

    console.error(activePlan.error);
    return false;
  }

  if (!activePlan.data?.id) {
    return false;
  }

  const { error } = await supabase
    .from("study_plan_items")
    .update({ conversion_order_id: orderId })
    .eq("study_plan_id", activePlan.data.id)
    .eq("course_id", courseId)
    .eq("selection_state", "active");

  if (error) {
    if (isMissingStudyPlanTableError(error)) {
      return false;
    }

    console.error(error);
    return false;
  }

  return true;
}

export async function fetchStudyPlanForUserWithClient(supabase, userId) {
  const activePlan = await supabase
    .from("study_plans")
    .select("id, user_id, status, created_at, updated_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (activePlan.error) {
    if (isMissingStudyPlanTableError(activePlan.error)) {
      return {
        schemaReady: false,
        plan: null,
        items: [],
        totalAmount: 0,
      };
    }

    throw activePlan.error;
  }

  if (!activePlan.data?.id) {
    return {
      schemaReady: true,
      plan: null,
      items: [],
      totalAmount: 0,
    };
  }

  const itemsResult = await supabase
    .from("study_plan_items")
    .select(`
      id,
      study_plan_id,
      course_id,
      note,
      priority_order,
      snapshot_price_idr,
      snapshot_title,
      snapshot_status,
      selection_state,
      conversion_order_id,
      added_at,
      updated_at,
      course:courses(
        id,
        slug,
        status,
        title_id,
        title_ar,
        short_description_id,
        short_description_ar,
        description_id,
        description_ar,
        level,
        course_model,
        duration_minutes,
        duration_weeks,
        price_idr,
        live_platform,
        category:categories(id, slug, title_id, title_ar)
      )
    `)
    .eq("study_plan_id", activePlan.data.id)
    .eq("selection_state", "active")
    .order("priority_order", { ascending: true, nullsFirst: false })
    .order("added_at", { ascending: false });

  if (itemsResult.error) {
    if (isMissingStudyPlanTableError(itemsResult.error)) {
      return {
        schemaReady: false,
        plan: activePlan.data,
        items: [],
        totalAmount: 0,
      };
    }

    throw itemsResult.error;
  }

  const items = itemsResult.data || [];
  return {
    schemaReady: true,
    plan: activePlan.data,
    items,
    totalAmount: items.reduce((sum, item) => sum + Number(item.snapshot_price_idr || item.course?.price_idr || 0), 0),
  };
}

export function normalizeStudyPlanStatus(status) {
  return ITEM_STATUSES.includes(status) ? status : "active";
}

export function normalizeStudyPlanRecordStatus(status) {
  return PLAN_STATUSES.includes(status) ? status : "active";
}
