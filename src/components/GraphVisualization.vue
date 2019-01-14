<template>
  <main class="graph">
    <header class="graph-header">
      <h1 class="graph-heading">
        Graph Visualization
      </h1>
      <div class="graph-header-links">
        <a href="#">Show on Github</a>
      </div>
    </header>
    <svg 
      v-if="graph.nodes"
      class="graph-svg" 
      :width="width"
      :height="height"
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="innerGrid" :width="innerGridSize" :height="innerGridSize" patternUnits="userSpaceOnUse">
          <rect width="100%" height="100%" fill="none" stroke="#eeeeee8a" stroke-width="0.5"/>
        </pattern>
        <pattern id="grid" :width="gridSize" :height="gridSize" patternUnits="userSpaceOnUse">
          <rect width="100%" height="100%" fill="url(#innerGrid)" stroke="#eeeeee8a" stroke-width="1.5"/>
        </pattern>
      </defs>
    </svg>
    <footer class="graph-footer">
      <div class="graph-footer-counter">
        {{ graph.nodes.length }} nodes / {{ graph.links.length }} edges
      </div>
      <div class="graph-footer-controls">
        <a href="#randomize" @click.prevent="generateRandomGraph">Randomize</a> 
        / 
        <label class="graph-upload">
          Upload JSON file
          <input type="file" accept="application/JSON" @change="loadTextFromFile" ref="fileInput">
        </label>
      </div>
    </footer>
  </main>
</template>

<script>
import * as d3 from "d3";
import * as utils from "../helpers/utils";
import bfs from "../helpers/breadth-first-search";

export default {
  name: "GraphVisualization",
  data() {
    return {
      width: null,
      height: null,
      d3Selections: {},
      simulation: null,
      gridSize: 100,
      gridMargin: 100,
      forceProperties: {
        center: {
          x: 0.5,
          y: 0.5
        },
        charge: {
          enabled: true,
          strength: -100,
          distanceMin: 50,
          distanceMax: 250
        },
        link: {
          enabled: true,
          distance: 50,
          iterations: 1
        }
      },
      graph: {
        nodes: [],
        links: []
      },
      selectedNodes: [],
      selectedPaths: []
    };
  },
  computed: {
    innerGridSize() {
      return this.gridSize / 10;
    }
  },
  methods: {
    handleResize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    },
    initForceSimulation() {
      this.simulation = d3
        .forceSimulation()
        .force("link", d3.forceLink(this.graph.links).id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter())
        .on("tick", this.onTick);
      this.updateForces();
    },
    initD3Selections() {
      this.d3Selections.svg = d3.select(this.$el.querySelector("svg"));
      this.d3Selections.grid = this.d3Selections.svg
        .append("rect")
        .attr("x", "-10%")
        .attr("y", "-10%")
        .attr("width", "410%")
        .attr("height", "410%")
        .attr("fill", "url(#grid)");
      this.d3Selections.graph = this.d3Selections.svg.append("g");
    },
    initZoom() {
      this.zoom = d3
        .zoom()
        .scaleExtent([0.7, 4])
        .on("zoom", this.onZoom);
      this.d3Selections.svg.call(this.zoom);
    },
    resetZoom() {
      this.d3Selections.svg
        .transition()
        .duration(750)
        .call(this.zoom.transform, d3.zoomIdentity);
    },
    generateRandomGraph() {
      const nodes = utils.makeRandomNodes(100, 200);
      const links = utils.makeRandomLinks(nodes, 2);
      this.graph = { nodes, links };
    },
    updateData() {
      this.selectedNodes = [];

      this.simulation.nodes(this.graph.nodes);
      this.simulation.force("link").links(this.graph.links);

      const simulation = this.simulation;
      const graph = this.d3Selections.graph;

      // TODO: Find proper way to reset svg
      // Force clear svg
      graph.selectAll("*").remove();

      graph
        .selectAll("path")
        .data(simulation.force("link").links())
        .enter()
        .append("path")
        .exit()
        .remove();

      graph
        .selectAll("circle")
        .data(simulation.nodes())
        .enter()
        .append("circle")
        .attr("r", 5)
        .on("click", this.onNodeClick)
        .call(
          d3
            .drag()
            .on("start", this.onNodeDragStarted)
            .on("drag", this.onNodeDragged)
            .on("end", this.onNodeDragEnded)
        )
        .exit()
        .remove();

      simulation.alpha(1).restart();
      this.resetZoom();
    },
    updateForces() {
      const { simulation, forceProperties, width, height } = this;
      simulation
        .force("center")
        .x(width * forceProperties.center.x)
        .y(height * forceProperties.center.y);
      simulation
        .force("link")
        .distance(forceProperties.link.distance)
        .iterations(forceProperties.link.iterations);

      simulation.alpha(1).restart();
    },
    highlightSelectedNodes() {
      const circles = this.d3Selections.graph.selectAll("circle");
      if (!this.selectedNodes.length) {
        circles.classed("selected", false);
      } else {
        circles
          .classed("selected", false)
          .filter(c => this.selectedNodes.indexOf(c) !== -1)
          .classed("selected", true);
      }
    },
    findPathsBetweenNodes() {
      if (this.selectedNodes.length !== 2) {
        this.selectedPaths = [];
        return;
      }
      const result = bfs(
        this.selectedNodes[0],
        this.selectedNodes[1],
        this.graph.links
      );
      this.selectedPaths = result || [];
    },
    highlightSelectedPaths() {
      if (this.selectedPaths.length) {
        this.selectedPaths.forEach(i => {
          this.d3Selections.graph
            .selectAll("path")
            .classed("path", true)
            .filter(
              p =>
                (p.source.index == i.source.index ||
                  p.source.index == i.target.index) &&
                (p.target.index == i.target.index ||
                  p.target.index == i.source.index)
            )
            .classed("selected", true);
        });
      } else {
        this.d3Selections.graph
          .selectAll("path")
          .classed("path", false)
          .classed("selected", false);
      }
    },
    onTick() {
      const transform = d => `translate(${d.x}, ${d.y})`;
      const link = d =>
        `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
      const graph = this.d3Selections.graph;

      graph.selectAll("path").attr("d", link);
      graph.selectAll("circle").attr("transform", transform);
    },
    onZoom() {
      const transform = d3.event.transform;
      const translate = `${transform.x %
        (this.gridSize * transform.k)}, ${transform.y %
        (this.gridSize * transform.k)}`;

      this.d3Selections.graph.attr("transform", transform);
      this.d3Selections.grid.attr(
        "transform",
        `translate(${translate}) scale(${transform.k})`
      );
      this.d3Selections.graph.attr("transform", transform);

      const graphBox = this.d3Selections.graph.node().getBBox();
      const gridOffsetTopLeft = [
        graphBox.x - this.gridMargin,
        graphBox.y - this.gridMargin
      ];
      const gridOffsetBottomRight = [
        graphBox.x + graphBox.width + this.gridMargin,
        graphBox.y + graphBox.height + this.gridMargin
      ];

      this.zoom.translateExtent([gridOffsetTopLeft, gridOffsetBottomRight]);
    },
    onNodeDragStarted(d) {
      if (!d3.event.active) {
        this.simulation.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    },
    onNodeDragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    },
    onNodeDragEnded(d) {
      if (!d3.event.active) {
        this.simulation.alphaTarget(0.0001);
      }
      d.fx = null;
      d.fy = null;
    },
    onNodeClick(node) {
      if (!this.graph.links.length) return;
      const index = this.selectedNodes.indexOf(node);

      if (index !== -1) {
        this.selectedNodes.splice(index, 1);
      } else if (this.selectedNodes.length == 2 && index == -1) {
        this.selectedNodes = [node];
      } else {
        this.selectedNodes.push(node);
      }
    },
    loadTextFromFile(ev) {
      const file = ev.target.files[0];
      const reader = new FileReader();
      reader.onload = e => {
        this.parseLoadedTextFromFile(e.target.result);
        this.$refs.fileInput.value = null;
      };
      reader.readAsText(file);
    },
    parseLoadedTextFromFile(str) {
      let data;
      // Check if json
      try {
        data = JSON.parse(str);
      } catch (e) {
        console.error("Invalid file format");
        return;
      }
      // TODO: Improve graph format check
      if (data.nodes && data.links && data.nodes.length && data.nodes[0].id) {
        this.graph = { ...data };
      } else {
        console.error("Invalid data format");
      }
    }
  },
  watch: {
    graph: {
      handler(newData) {
        this.updateData();
      },
      deep: true
    },
    selectedNodes: {
      handler(newNodes) {
        this.highlightSelectedNodes();
        this.findPathsBetweenNodes();
      },
      deep: true
    },
    selectedPaths: {
      handler(newPaths) {
        this.highlightSelectedPaths();
      },
      deep: true
    }
  },
  mounted() {
    this.handleResize();
    window.addEventListener("resize", this.handleResize);

    this.initForceSimulation();
    this.initD3Selections();
    this.initZoom();

    this.generateRandomGraph();
  }
};
</script>

<style lang="scss">
.graph {
  a {
    font-size: 12px;
    color: #333;
    text-decoration: none;
    border-bottom: 1px solid rgba(#333, 0.5);
    &:hover {
      border: 0;
    }
  }
  &-header {
    position: fixed;
    top: 20px;
    left: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    &-links {
      display: inline-block;
      padding: 5px;
      background: #fff;
      font-size: 12px;
    }
  }
  &-heading {
    margin: 0;
    font-size: 16px;
    cursor: default;
  }
  &-svg {
    display: block;
    margin: 0;
    padding: 0;
    path {
      fill: none;
      stroke: #999;
      stroke-width: 0.5px;
      opacity: 0.5;
      &.path {
        opacity: 0.2;
        &.selected {
          stroke: #3f72af;
          opacity: 1;
        }
      }
    }

    circle {
      fill: #333333;
      stroke: #ffffff;
      stroke-width: 1px;
      cursor: pointer;
      &.selected {
        fill: #3f72af;
        stroke: #3f72af;
      }
    }
  }
  &-footer {
    position: fixed;
    left: 20px;
    right: 20px;
    bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    &-counter,
    &-controls {
      display: inline-block;
      padding: 5px;
      background: #fff;
      font-size: 12px;
    }
  }
  &-upload {
    position: relative;
    cursor: pointer;
    border-bottom: 1px solid rgba(#333, 0.5);
    &:hover {
      border: 0;
    }
    input {
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
      opacity: 0;
    }
  }
}
</style>
