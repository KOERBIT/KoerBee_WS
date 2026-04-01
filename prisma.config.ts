import dotenv from "dotenv";
dotenv.config();

import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .env file");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --project tsconfig.json prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});