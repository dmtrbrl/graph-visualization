<template>
  <div id="app">
    <GraphVisualization />
  </div>
</template>

<script>
import GraphVisualization from "./components/GraphVisualization.vue";

export default {
  name: "app",
  components: {
    GraphVisualization
  }
};
</script>

<style lang="scss">
@import url("https://fonts.googleapis.com/css?family=Source+Code+Pro:400,700");
* {
  box-sizing: border-box;
}
body {
  padding: 0;
  margin: 0;
  font-family: "Source Code Pro", monospace;
  color: #333333;
}
</style>
