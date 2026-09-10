export function canAuthorArticles(profile) {
  return Boolean(
    profile?.role === "admin"
    || profile?.role === "instructor"
    || profile?.is_writer,
  );
}

export function canBetaTest(profile) {
  return Boolean(profile?.is_beta_tester || profile?.role === "admin");
}

export function isAdmin(profile) {
  return profile?.role === "admin";
}
