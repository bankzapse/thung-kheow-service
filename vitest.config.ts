import { defineConfig } from "vitest/config";

// เทสเฉพาะ logic ล้วน (pure functions) — ไม่ต้องมี DOM/เบราว์เซอร์
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    globals: false,
  },
});
