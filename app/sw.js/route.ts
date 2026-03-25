import { createSerwistRoute } from "@serwist/turbopack";

const serwistRoute = createSerwistRoute({
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
});

// Use literal strings so Next.js AST parser accepts it
export const dynamic = "force-dynamic";

// Export the GET route independently, stripping the types to prevent mismatch
export const GET = serwistRoute.GET as any;

