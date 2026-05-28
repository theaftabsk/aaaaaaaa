import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import fs from "fs";
import path from "path";

const schemaPath = fs.existsSync(path.join(__dirname, "prisma/schema.prisma"))
  ? "prisma/schema.prisma"
  : "schema.prisma";

export default defineConfig({
  schema: schemaPath,
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
});
