import { defineConfig } from "prisma/config";

// Load .env locally — on Vercel, env vars are set natively
try {
  const dotenv = await import("dotenv");
  dotenv.config();
} catch {
  // dotenv not available, env vars already set
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
