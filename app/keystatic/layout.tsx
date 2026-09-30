import KeystaticApp from './keystatic-client';

// Route-scoped admin shell. The shared root layout stays free of Keystatic
// imports so editor code never enters public bundles.
export default function KeystaticLayout() {
  return <KeystaticApp />;
}
