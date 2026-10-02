import { add } from "./utils";
import { fetchUser } from "@services/api";

export async function run() {
  const result = add(10, 20);
  const user = await fetchUser("user_1");
  const legacy = await import("./legacy/helper.js");
  return { result, user, legacy };
}
