import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import * as fs from "fs";
import * as path from "path";

const schemaPath = fs.existsSync(path.join(process.cwd(), "prisma/schema.prisma"))
  ? "prisma/schema.prisma"
  : "schema.prisma";

export default defineConfig({
  schema: schemaPath,
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  } as any,
});
