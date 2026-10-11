export function canAccessEditorial(profile) {
  return Boolean(profile && (
    profile.role === "admin"
    || profile.role === "instructor"
    || profile.is_writer === true
  ));
}

export function canReviewArticles(profile) {
  return profile?.role === "admin";
}

export function canManageLandingPage(profile) {
  return profile?.role === "admin";
}

export function landingSettingItems(items, profile) {
  return items.filter((item) => item.href !== "/halaman-utama" || canManageLandingPage(profile));
}
