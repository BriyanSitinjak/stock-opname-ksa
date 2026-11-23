import { Prisma } from "@prisma/client";

export function isMissingRelation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2010");
}

export function isMissingColumn(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  const meta = error.meta;
  return typeof meta === "object" && meta !== null && "code" in meta && meta.code === "42703";
}
