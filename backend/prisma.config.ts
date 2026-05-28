import "dotenv/config";
import { defineConfig } from "prisma/config";
import * as fs from "fs";
import * as path from "path";

const schemaPath = fs.existsSync(path.join(process.cwd(), "prisma/schema.prisma"))
  ? "prisma/schema.prisma"
  : "schema.prisma";

export default defineConfig({
  schema: schemaPath,
});
