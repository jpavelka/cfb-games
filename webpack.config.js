const HtmlWebPackPlugin = require("html-webpack-plugin");
const path = require("path");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader"
          }
        ]
      },
      {
        test:/\.css$/,
        use:['style-loader','css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: "./src/index.html",
      filename: "./index.html"
    }),
    new CleanWebpackPlugin()
  ],
  devServer: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      '.gitpod.io'
    ]
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'main.[contenthash].js'
  }
};