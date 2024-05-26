/** Emulate the node -r flag for the taskless config file. To be used inside a test */
export const dashrConfig = async (fixture: string) => {
  const file = `@test/fixtures/${fixture}`;
  await import(file);
};
