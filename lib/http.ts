import { NextResponse } from "next/server";

export function jsonError(
  message: string,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function parseJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
