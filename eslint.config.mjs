import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** ESLint flat config (ESLint 9) — Next 16 ตัดคำสั่ง `next lint` ออก จึงใช้ eslint ตรง
 *  eslint-config-next@16 export เป็น flat config array แล้ว (นำมา spread ได้เลย) */
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "public/**", "out/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      // กฎ react-compiler (Next 16) เปิดเป็น error ตาม default — refactor โค้ดเรียบร้อยแล้ว
    },
  },
];

export default eslintConfig;
