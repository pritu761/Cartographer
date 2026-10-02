import { formatCurrency } from "@utils/format";

export interface User {
  id: string;
  name: string;
  balance: number;
}

export async function fetchUser(id: string): Promise<User> {
  const balance = 120.5;
  console.log(`Balance formatted: ${formatCurrency(balance)}`);
  return { id, name: "Sample User", balance };
}
