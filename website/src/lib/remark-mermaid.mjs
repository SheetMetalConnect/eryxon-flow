/**
 * Turn ```mermaid fenced code blocks into <pre class="mermaid"> so the client
 * Mermaid script (see Head.astro) can render them as SVG. Running at the remark
 * (mdast) stage means Expressive Code never sees these blocks, so they don't
 * render as syntax-highlighted code.
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function remarkMermaid() {
  return (tree) => {
    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        if (child.type === "code" && child.lang === "mermaid") {
          return {
            type: "html",
            value: `<pre class="mermaid not-content">${escapeHtml(child.value)}</pre>`,
          };
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}
