import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.url });

export default compat.config({
  extends: ["universe/native", "universe/web"],
  ignorePatterns: ["build"],
  rules: {
    "node/handle-callback-err": "off",
  },
});
