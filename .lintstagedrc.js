// syncpack commands
const syncpack = {
  listMismatches: () => "syncpack list-mismatches",
  format: () => "syncpack format",
};

const config = {
  // prettier formatting only
  "*.(md|json|graphql)": "prettier --write",

  // package.json formatting
  "./package.json": [
    syncpack.listMismatches,
    syncpack.format,
    "prettier --write",
  ],

  // // source files
  "*.{js,jsx,ts,tsx}": ["xo --fix", "prettier --write"],
};

export default config;
