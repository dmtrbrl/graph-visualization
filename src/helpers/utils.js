const newNodeName = () => {
  return Math.random()
    .toString(36)
    .substring(7);
};

export const newNode = nodeId => {
  return { id: nodeId, name: newNodeName() };
};

export const makeRandomNodes = (minNodes, maxNodes) => {
  let nodesNumber = Math.floor(
    Math.random() * (maxNodes - minNodes + 1) + minNodes
  );
  let nodes = Array.apply(null, { length: nodesNumber }).map((value, index) => {
    return newNode(index);
  });
  return nodes;
};

export const newLink = (id, source, target) => {
  return { id, source, target };
};

export const makeRandomLinks = (nodes, maxLinks) => {
  let links = [];
  let id = 0;
  for (let node of nodes) {
    let total = Math.floor(Math.random() * maxLinks);
    for (let i = 0; i <= total; i++) {
      let target = Math.floor(Math.random() * nodes.length);
      let source = node.id;
      id++;
      links.push(newLink(id, source, target));
    }
  }
  return links;
};
