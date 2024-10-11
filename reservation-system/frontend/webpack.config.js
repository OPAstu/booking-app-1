const webpack = require("webpack");

module.exports = {
  resolve: {
    fallback: {
      buffer: require.resolve("buffer/"),
      url: require.resolve("url/"),
      https: require.resolve("https-browserify"),
      http: require.resolve("stream-http"),
      querystring: require.resolve("querystring-es3"),
      stream: require.resolve("stream-browserify"),
      assert: require.resolve("assert/"),
      os: require.resolve("os-browserify/browser"),
      crypto: require.resolve("crypto-browserify"),
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      zlib: require.resolve("browserify-zlib"),
      path: require.resolve("path-browserify"),
      process: require.resolve("process/browser"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
  ],
  devServer: {
    allowedHosts: ["localhost"], // 許可したいホスト名を設定
  },
};
