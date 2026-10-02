import { headers } from "next/headers";

export interface OrgContext {
  orgId: string;
  userId: string;
  isDemo: boolean;
}

const DEMO_ORG_ID = "org_demo_local";
const DEMO_USER_ID = "user_demo_local";

/**
 * Extracts organization identity claim from the token carried on the request.
 * Follows the decision: Decisions are made by reading the claim off the token,
 * never by querying the identity provider at runtime.
 */
export async function getRequestOrgContext(): Promise<OrgContext> {
  const headersList = await headers();

  // 1. Check custom organization header passed by client or proxy
  const headerOrg = headersList.get("x-cartograph-org-id");
  if (headerOrg) {
    return {
      orgId: headerOrg,
      userId: headersList.get("x-cartograph-user-id") || DEMO_USER_ID,
      isDemo: false,
    };
  }

  // 2. Read Clerk auth JWT token from Authorization header or cookie if present
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      // Decode JWT payload without calling remote identity provider
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);
        const orgId = payload.org_id || payload.orgId;
        const userId = payload.sub || payload.userId;
        if (orgId) {
          return {
            orgId,
            userId: userId || DEMO_USER_ID,
            isDemo: false,
          };
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback to local demo organization
  return {
    orgId: DEMO_ORG_ID,
    userId: DEMO_USER_ID,
    isDemo: true,
  };
}
