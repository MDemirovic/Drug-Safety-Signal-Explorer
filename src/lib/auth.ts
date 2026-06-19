import "server-only";

import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";

import {
  getBetterAuthSecret,
  getBetterAuthUrl,
  isAdminEmail,
} from "@/lib/auth/config";
import { ensureBetterAuthUserEmailIndex } from "@/lib/db/auth-indexes";
import { getDatabaseHandle, getMongoClientHandle } from "@/lib/db/mongodb";

const database = getDatabaseHandle();
const mongoClient = getMongoClientHandle();

export const auth = betterAuth({
  appName: "Drug Safety Signal Explorer",
  baseURL: getBetterAuthUrl(),
  secret: getBetterAuthSecret(),
  database: mongodbAdapter(database, { client: mongoClient }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        async before(user, context) {
          if (context?.path === "/sign-up/email" && isAdminEmail(user.email)) {
            throw APIError.from("FORBIDDEN", {
              code: "ADMIN_EMAIL_SIGNUP_FORBIDDEN",
              message: "This email cannot be registered through public sign-up.",
            });
          }

          if (context?.path === "/sign-up/email") {
            await ensureBetterAuthUserEmailIndex(database);
          }
        },
      },
    },
  },
});
