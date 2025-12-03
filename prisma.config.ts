import { defineConfig } from "prisma/config";
import "dotenv/config"; 

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.POSTGRES_URL_NON_POOLING!,
  },
});