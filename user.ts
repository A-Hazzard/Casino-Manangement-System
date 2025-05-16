import { jwtVerify, type JWTPayload } from "jose";

export async function getUserFromServer(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET || "")
    );
    return payload as JWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    throw new Error("JWT verification failed");
  }
}
