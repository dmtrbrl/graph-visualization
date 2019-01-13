<template>
  <div class="graph">
    <h1 class="graph-heading">
      Graph Visualization
    </h1>
    <svg 
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
    <div class="graph-counter" v-if="graph.nodes.length && graph.links.length">
      Nodes: {{ graph.nodes.length }} / Links: {{ graph.links.length }}
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";
import graphIcon from "../assets/graph-icon.svg";

export default {
  name: "GraphVisualization",
  data() {
    return {
      width: null,
      height: null,
      selections: {},
      simulation: null,
      gridSize: 100,
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
      icons: {
        graph: graphIcon
      }
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
    initSimulation() {
      this.simulation = d3
        .forceSimulation()
        .force("link", d3.forceLink().links(this.graph.links))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter())
        .on("tick", this.tick);
      this.updateForces();
    },
    tick() {
      const transform = d => `translate(${d.x}, ${d.y})`;

      const link = d =>
        `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;

      const graph = this.selections.graph;
      graph.selectAll("path").attr("d", link);
      graph.selectAll("circle").attr("transform", transform);
    },
    loadDataFromUrl(
      url = "https://raw.githubusercontent.com/domoritz/maps/master/data/miserables.json"
    ) {
      d3
        .json(url)
        .then(data => {
          this.graph = data;
        })
        .catch(error => {
          console.error(
            "Cannot proceed with simulation, failed to  retrieve data."
          );
        });
    },
    updateData() {
      this.simulation.nodes(this.graph.nodes);
      this.simulation.force("link").links(this.graph.links);

      const simulation = this.simulation;
      const graph = this.selections.graph;

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
        .call(
          d3
            .drag()
            .on("start", this.nodeDragStarted)
            .on("drag", this.nodeDragged)
            .on("end", this.nodeDragEnded)
        )
        .exit()
        .remove();

      simulation.alpha(1).restart();
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
    zoomed() {
      const transform = d3.event.transform;

      const translate = `${transform.x %
        (this.gridSize * transform.k)}, ${transform.y %
        (this.gridSize * transform.k)}`;
      this.selections.graph.attr("transform", transform);

      this.selections.grid.attr(
        "transform",
        `translate(${translate}) scale(${transform.k})`
      );
      this.selections.graph.attr("transform", transform);

      const graphBox = this.selections.graph.node().getBBox();
      const margin = 100;
      const worldTopLeft = [graphBox.x - margin, graphBox.y - margin];
      const worldBottomRight = [
        graphBox.x + graphBox.width + margin,
        graphBox.y + graphBox.height + margin
      ];
      this.zoom.translateExtent([worldTopLeft, worldBottomRight]);
    },
    nodeDragStarted(d) {
      if (!d3.event.active) {
        this.simulation.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    },
    nodeDragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    },
    nodeDragEnded(d) {
      if (!d3.event.active) {
        this.simulation.alphaTarget(0.0001);
      }
      d.fx = null;
      d.fy = null;
    }
  },
  watch: {
    graph: {
      handler(newData) {
        this.updateData();
      },
      deep: true
    },
    forceProperties: {
      handler(newForce) {
        this.updateForces();
      },
      deep: true
    }
  },
  mounted() {
    this.handleResize();
    window.addEventListener("resize", this.handleResize);

    this.initSimulation();
    this.selections.svg = d3.select(this.$el.querySelector("svg"));

    const svg = this.selections.svg;
    this.selections.grid = svg
      .append("rect")
      .attr("x", "-10%")
      .attr("y", "-10%")
      .attr("width", "410%")
      .attr("height", "410%")
      .attr("fill", "url(#grid)");

    this.selections.graph = this.selections.svg.append("g");

    this.zoom = d3
      .zoom()
      .scaleExtent([1 / 2, 2])
      .on("zoom", this.zoomed);
    svg.call(this.zoom);

    this.loadDataFromUrl();
  }
};
</script>

<style lang="scss">
.graph {
  &-heading {
    position: fixed;
    top: 20px;
    left: 20px;
    display: flex;
    align-items: center;
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
    }

    circle {
      fill: #333333;
      stroke: #ffffff;
      stroke-width: 1px;
    }
  }
  &-counter {
    position: fixed;
    left: 20px;
    bottom: 20px;
    display: inline-block;
    padding: 5px;
    background: #fff;
    font-size: 12px;
  }
}
</style>
