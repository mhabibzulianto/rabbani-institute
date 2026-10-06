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
