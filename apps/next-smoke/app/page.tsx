import { DrawoverBootstrap } from "./drawover-bootstrap";

export default function Page() {
  return (
    <main>
      <h1>Next.js production strip smoke</h1>
      <p>The Drawover import is available only behind the environment guard.</p>
      <DrawoverBootstrap />
    </main>
  );
}
