import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL!, 
  },
});
// import { defineConfig, env } from "prisma/config";
// import "dotenv/config";

// export default defineConfig({
//   schema: "prisma/schema.prisma",
//   migrations: {
//     path: "prisma/migrations",
//   },
//   engine: "classic",
//   datasource: {
//     url: env("DATABASE_URL"),
//   },
// });


import ".env/config";

// Minimalna, bezpieczna konfiguracja — wskazuje lokalizację pliku schema.prisma
export default {
  schema: "./prisma/schema.prisma",
};
