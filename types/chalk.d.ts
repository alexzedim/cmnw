declare module 'chalk' {
  type ChalkChain = ((text: unknown) => string) & Record<string, ChalkChain>;
  const chalk: ChalkChain & Record<string, ChalkChain>;
  export default chalk;
}
