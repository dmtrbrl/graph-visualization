const addNode = (graph, node) => {
  graph.set(node, { in: new Set(), out: new Set() });
};

const connectNodes = (graph, source, target) => {
  graph.get(source).out.add(target);
  graph.get(target).in.add(source);
};

const buildGraphFromEdges = edges =>
  edges.reduce((graph, { source, target }) => {
    if (!graph.has(source)) {
      addNode(graph, source);
    }

    if (!graph.has(target)) {
      addNode(graph, target);
    }

    connectNodes(graph, source, target);
    connectNodes(graph, target, source);

    return graph;
  }, new Map());

const buildPath = (target, path) => {
  const result = [];

  while (path.has(target)) {
    const source = path.get(target);
    result.push({ source, target });
    target = source;
  }

  return result.reverse();
};

export default (source, target, links) => {
  const graph = buildGraphFromEdges(links);

  if (!graph.has(source)) {
    throw new Error("Unknown source.");
  }

  if (!graph.has(target)) {
    throw new Error("Unknown target.");
  }

  const queue = [source];
  const visited = new Set();
  const path = new Map();

  while (queue.length > 0) {
    const start = queue.shift();

    if (start.index === target.index) {
      return buildPath(start, path);
    }

    for (const next of graph.get(start).out) {
      if (visited.has(next)) {
        continue;
      }

      if (!queue.includes(next)) {
        path.set(next, start);
        queue.push(next);
      }
    }

    visited.add(start);
  }

  return null;
};
