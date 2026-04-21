const path = require("path");

const APP_ROOT_ABS = path.resolve(__dirname, "app");

// Custom plugin that replaces every occurrence of
// `process.env.EXPO_ROUTER_APP_ROOT` with a string literal pointing to the
// absolute path of the app directory.
//
// Why we need this: in a pnpm monorepo, `babel-preset-expo` is hoisted to the
// workspace root. Its built-in expo-router transform is gated by
// `hasModule('expo-router')` which calls `require.resolve('expo-router')` from
// the hoisted location. That call FAILS because expo-router lives under
// artifacts/service-qc/node_modules — so the transform is never registered and
// Metro chokes on `require.context(process.env.EXPO_ROUTER_APP_ROOT, ...)`
// inside expo-router/_ctx.*.js with:
//   "Invalid call: process.env.EXPO_ROUTER_APP_ROOT"
//
// This plugin reproduces what babel-preset-expo would have done.
function inlineExpoRouterAppRoot({ types: t }) {
  return {
    name: "inline-expo-router-env",
    visitor: {
      MemberExpression(p, state) {
        const node = p.node;
        if (
          !(
            t.isMemberExpression(node.object) &&
            t.isIdentifier(node.object.object, { name: "process" }) &&
            t.isIdentifier(node.object.property, { name: "env" }) &&
            t.isIdentifier(node.property)
          )
        ) {
          return;
        }
        const name = node.property.name;
        const filename = state.file.opts.filename;
        switch (name) {
          case "EXPO_ROUTER_APP_ROOT": {
            const value = filename
              ? path.relative(path.dirname(filename), APP_ROOT_ABS)
              : APP_ROOT_ABS;
            p.replaceWith(t.stringLiteral(value));
            break;
          }
          case "EXPO_ROUTER_ABS_APP_ROOT":
          case "EXPO_PROJECT_ROOT": {
            p.replaceWith(t.stringLiteral(APP_ROOT_ABS));
            break;
          }
          case "EXPO_ROUTER_IMPORT_MODE": {
            p.replaceWith(t.stringLiteral("sync"));
            break;
          }
          default:
            return;
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [inlineExpoRouterAppRoot],
  };
};
