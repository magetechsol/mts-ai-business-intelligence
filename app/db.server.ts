import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
  prisma = global.prismaGlobal;
} else {
  prisma = new PrismaClient();
}

export default prisma;
