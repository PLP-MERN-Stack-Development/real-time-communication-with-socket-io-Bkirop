import react from "@vitejs/plugin-react";

export default {
  plugins: [react()],
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"]
  },
  server: {
    host: true
  },
  optimizeDeps: {
    include: ["@emotion/react", "@emotion/styled"]
  }
};
