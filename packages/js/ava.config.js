const config = {
  extensions: {
    ts: "module",
  },
  timeout: "20s",
  nodeArguments: ["--import=tsimp", "--no-warnings", "--enable-source-maps"],
};

export default config;
