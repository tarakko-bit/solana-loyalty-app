import bcrypt from "bcrypt";
import { db } from "./db";
import { admins } from "@shared/schema";

const PREDEFINED_ADMINS = {
  nginx: "#Nx2025@Admin$",
  asmaa: "@As2025#Secure!",
  tarak: "$Tr2025@Panel#",
  hamza: "#Hz2025$Admin@",
  dokho: "@Dk2025#Panel$",
};

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function initializeAdmins() {
  for (const [username, password] of Object.entries(PREDEFINED_ADMINS)) {
    const [existingAdmin] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username));

    if (!existingAdmin) {
      await db.insert(admins).values({
        username,
        password: await hashPassword(password),
        isFirstLogin: true,
      });
      console.log(`Created admin account: ${username}`);
    }
  }
}
