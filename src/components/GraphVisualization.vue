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
      {{ graph.nodes.length }} nodes / {{ graph.links.length }} edges
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";

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
      selectedNodes: []
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
        .force("link", d3.forceLink().links(this.graph.links))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter())
        .on("tick", this.tick);
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
        .scaleExtent([1 / 2, 2])
        .on("zoom", this.onZoom);
      this.d3Selections.svg.call(this.zoom);
    },
    tick() {
      const transform = d => `translate(${d.x}, ${d.y})`;

      const link = d =>
        `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;

      const graph = this.d3Selections.graph;
      graph.selectAll("path").attr("d", link);
      graph.selectAll("circle").attr("transform", transform);
    },
    loadDefaultDummyData() {
      d3
        .json(
          "https://raw.githubusercontent.com/domoritz/maps/master/data/miserables.json"
        )
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
      const graph = this.d3Selections.graph;

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
            .on("start", this.onNodeDragStarted)
            .on("drag", this.onNodeDragged)
            .on("end", this.onNodeDragEnded)
        )
        .on("click", this.onNodeClick)
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
    onNodeClick(d) {
      console.log(d.selected);

      d.selected = true;

      const circle = this.d3Selections.graph.selectAll("circle");
      // circle.classed("selected", false);
      circle.filter(td => td === d).classed("selected", true);
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

    this.initForceSimulation();
    this.initD3Selections();
    this.initZoom();

    this.loadDefaultDummyData();
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
      cursor: pointer;
      &.selected {
        fill: #3f72af;
      }
    }
  }
  &-counter {
    position: fixed;
    left: 20px;
    bottom: 20px;
    font-size: 12px;
  }
}
</style>
