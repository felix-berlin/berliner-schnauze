type Node = { type?: string; children?: Node[]; [k: string]: unknown };

/** All nodes of `type` in a stored Lexical state (depth-first). */
export function lexicalNodes(state: unknown, type: string): Node[] {
  const out: Node[] = [];
  const walk = (n: Node) => {
    if (n.type === type) out.push(n);
    n.children?.forEach(walk);
  };
  const root = (state as { root?: Node } | null)?.root;
  if (root) walk(root);
  return out;
}
