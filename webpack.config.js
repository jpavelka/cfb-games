const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const path = require('path');
const { env } = require("process");
const { endianness } = require("os");


module.exports = env => {
  env = env || {}
  let entry = ["@babel/polyfill", './src/app.js'];
  if (env.dataSource == 'saved'){
    entry[1] = './src/app-saved-data.js'
  }
  return {
    entry: entry,
    output: {
        filename: '[name].bundle.[contenthash].js',
        path: path.resolve(__dirname, 'docs')
    },
    module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env']
              }
            }
          },
          {
            test: /\.css$/,
            use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
          },
        ]
      },
    plugins: [
        new HtmlWebpackPlugin({
            title: "CFB Games",
        }),
        new CleanWebpackPlugin()
    ],
    devServer: {
        contentBase: './dist',
        open: true
    },
  }
};