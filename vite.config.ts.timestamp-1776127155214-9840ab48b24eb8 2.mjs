// vite.config.ts
import { defineConfig } from "file:///Users/sommeliana/Documents/New%20project/sommelyx/node_modules/vite/dist/node/index.js";
import react from "file:///Users/sommeliana/Documents/New%20project/sommelyx/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "/Users/sommeliana/Documents/New project/sommelyx";
var vite_config_default = defineConfig(async ({ mode }) => {
  const plugins = [react()];
  if (mode === "development") {
    const { componentTagger } = await import("file:///Users/sommeliana/Documents/New%20project/sommelyx/node_modules/lovable-tagger/dist/index.js");
    plugins.push(componentTagger());
  }
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false
      }
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvc29tbWVsaWFuYS9Eb2N1bWVudHMvTmV3IHByb2plY3Qvc29tbWVseXhcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9zb21tZWxpYW5hL0RvY3VtZW50cy9OZXcgcHJvamVjdC9zb21tZWx5eC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvc29tbWVsaWFuYS9Eb2N1bWVudHMvTmV3JTIwcHJvamVjdC9zb21tZWx5eC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyhhc3luYyAoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgcGx1Z2lucyA9IFtyZWFjdCgpXTtcblxuICAvLyBLZWVwIGBsb3ZhYmxlLXRhZ2dlcmAgY29tcGxldGVseSBvdXQgb2YgcHJvZHVjdGlvbiBidWlsZHMuXG4gIGlmIChtb2RlID09PSBcImRldmVsb3BtZW50XCIpIHtcbiAgICBjb25zdCB7IGNvbXBvbmVudFRhZ2dlciB9ID0gYXdhaXQgaW1wb3J0KFwibG92YWJsZS10YWdnZXJcIik7XG4gICAgcGx1Z2lucy5wdXNoKGNvbXBvbmVudFRhZ2dlcigpIGFzIGFueSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNlcnZlcjoge1xuICAgICAgaG9zdDogXCI6OlwiLFxuICAgICAgcG9ydDogODA4MCxcbiAgICAgIGhtcjoge1xuICAgICAgICBvdmVybGF5OiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBwbHVnaW5zLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9VLFNBQVMsb0JBQW9CO0FBQ2pXLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhLE9BQU8sRUFBRSxLQUFLLE1BQU07QUFDOUMsUUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDO0FBR3hCLE1BQUksU0FBUyxlQUFlO0FBQzFCLFVBQU0sRUFBRSxnQkFBZ0IsSUFBSSxNQUFNLE9BQU8scUdBQWdCO0FBQ3pELFlBQVEsS0FBSyxnQkFBZ0IsQ0FBUTtBQUFBLEVBQ3ZDO0FBRUEsU0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sS0FBSztBQUFBLFFBQ0gsU0FBUztBQUFBLE1BQ1g7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
