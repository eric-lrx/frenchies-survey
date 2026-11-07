import { PrismaClient } from "@prisma/client";
import "./config.js";

// One client per process. Its connection string is DATABASE_URL, which the tests point
// at the separate test database before this module loads.
export const prisma = new PrismaClient();
