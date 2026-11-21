import {
  rmSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import postcss from "rollup-plugin-postcss";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

// Start from an empty dist so renamed outputs (e.g. the old CJS dist/index.js)
// can never be published by accident.
rmSync("dist", { recursive: true, force: true });

// In a "type": "module" package TypeScript reads every .d.ts as ESM types.
// CommonJS consumers (moduleResolution node16/nodenext) need .d.cts twins whose
// relative imports point at .cjs paths, which resolve to the matching .d.cts.
// https://www.typescriptlang.org/docs/handbook/modules/reference.html
const ctsTypes = {
  name: "cts-types",
  closeBundle() {
    // closeBundle also runs after a failed build; don't mask the real error.
    if (!existsSync("dist")) return;
    for (const file of readdirSync("dist")) {
      if (!file.endsWith(".d.ts")) continue;
      // The JS bundles don't import the CSS (postcss extracts it), so drop the
      // side-effect import from the types too; it breaks consumers using
      // `noUncheckedSideEffectImports`.
      const esm = readFileSync(`dist/${file}`, "utf8").replace(
        /^import "\.\/styles\.css";\r?\n/m,
        ""
      );
      writeFileSync(`dist/${file}`, esm);
      const cjs = esm
        .replace(/(from "\.\/[^"]+)\.js"/g, '$1.cjs"')
        .replace(/\n?\/\/# sourceMappingURL=.*$/, "\n");
      writeFileSync(`dist/${file.replace(/\.d\.ts$/, ".d.cts")}`, cjs);
    }
  },
};

export default {
  input: "src/index.ts",
  output: [
    {
      // .cjs is always CommonJS; a .js file would be read as ESM because of
      // "type": "module", leaving require() with no exports.
      file: "dist/index.cjs",
      format: "cjs",
      exports: "named",
      sourcemap: true,
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    },
  ],
  external: ["react"],
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      declarationDir: "./dist",
      tslib: "tslib",
    }),
    postcss({
      extract: "styles.css",
      minimize: true,
    }),
    ctsTypes,
  ],
};
