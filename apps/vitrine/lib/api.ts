import "server-only";
import { NextResponse } from "next/server";
import { currentUser, HttpError, type User } from "./auth";

/** Run an authenticated JSON handler and turn HttpErrors into responses. */
export async function withUser(fn: (user: User) => Promise<unknown> | unknown) {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "Faça login para continuar.");
    const out = await fn(user);
    return out instanceof Response
      ? out
      : NextResponse.json(out ?? { ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json(
    { error: "Erro inesperado. Tente de novo." },
    { status: 500 }
  );
}

export async function jsonBody<T = Record<string, unknown>>(
  req: Request
): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Corpo da requisição inválido.");
  }
}
