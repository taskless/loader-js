/** Emulate the node -r flag for the taskless config file. To be used inside a test */
export const dashrConfig = async (fixture: string) => {
  const file = `../fixtures/${fixture}`;
  await import(file);

  return true;
};
