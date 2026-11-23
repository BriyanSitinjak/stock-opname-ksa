import { Prisma } from "@prisma/client";

export function isMissingRelation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2010");
}

export async function whenRelationMissing<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isMissingRelation(error)) {
      return fallback;
    }
    throw error;
  }
}

export async function whenColumnMissing<T>(run: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isMissingColumn(error)) {
      throw error;
    }
    return fallback();
  }
}

export function isMissingColumn(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  const meta = error.meta;
  return typeof meta === "object" && meta !== null && "code" in meta && meta.code === "42703";
}
