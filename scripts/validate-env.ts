import { config } from "dotenv";
import { EnvironmentValidationError, readDeploymentEnv } from "../src/lib/env/server";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

try {
  readDeploymentEnv();
  console.log("Deployment environment is valid.");
} catch (error) {
  if (error instanceof EnvironmentValidationError) {
    console.error(`Invalid deployment environment: ${error.fields.join(", ")}.`);
  } else {
    console.error("Deployment environment validation failed.");
  }
  process.exitCode = 1;
}
