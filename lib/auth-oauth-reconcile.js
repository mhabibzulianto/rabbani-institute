import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildCallbackUrl } from "@/lib/sso";

const socialProviders = new Set([
  "apple",
  "azure",
  "bitbucket",
  "discord",
  "facebook",
  "figma",
  "github",
  "gitlab",
  "google",
  "kakao",
  "keycloak",
  "linkedin",
  "linkedin_oidc",
  "notion",
  "slack",
  "slack_oidc",
  "spotify",
  "twitch",
  "twitter",
  "workos",
  "x",
  "zoom",
  "fly",
]);

function isConfirmedUser(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function getProvider(user) {
  return user?.app_metadata?.provider || user?.identities?.[0]?.provider || null;
}

function compareCandidatePriority(a, b) {
  const aHasEmail = (a.identities || []).some((identity) => identity.provider === "email");
  const bHasEmail = (b.identities || []).some((identity) => identity.provider === "email");

  if (aHasEmail !== bHasEmail) {
    return aHasEmail ? -1 : 1;
  }

  const aConfirmed = isConfirmedUser(a);
  const bConfirmed = isConfirmedUser(b);
  if (aConfirmed !== bConfirmed) {
    return aConfirmed ? -1 : 1;
  }

  return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
}

async function findExistingUserByEmail(admin, email, currentUserId) {
  const normalizedEmail = email.trim().toLowerCase();
  const matches = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    for (const user of users) {
      if (!user?.email || user.id === currentUserId) {
        continue;
      }

      if (user.email.trim().toLowerCase() === normalizedEmail) {
        matches.push(user);
      }
    }

    if (users.length < 200) {
      break;
    }
  }

  return matches.sort(compareCandidatePriority)[0] || null;
}

export async function reconcileOAuthUserToExistingEmail({ supabase, next }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const provider = getProvider(user);
  if (!provider || !socialProviders.has(provider)) {
    return null;
  }

  if (!isConfirmedUser(user)) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const existingUser = await findExistingUserByEmail(admin, user.email, user.id);
  if (!existingUser || !isConfirmedUser(existingUser)) {
    return null;
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: existingUser.email,
    options: {
      redirectTo: buildCallbackUrl(next),
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    throw linkError || new Error("Gagal membuat magic link untuk akun yang sudah ada.");
  }

  await supabase.auth.signOut();

  const currentIdentities = user.identities || [];
  if (currentIdentities.length <= 1) {
    await admin.auth.admin.deleteUser(user.id);
  }

  return linkData.properties.action_link;
}
