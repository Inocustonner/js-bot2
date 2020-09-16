// common configuration
const path = require("path")
const HtmlWebPackPlugin = require("html-webpack-plugin")

const out_dir = "extension"

var config = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ["ts-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        use: "html-loader",
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  devtool: "inline-source-map",
  plugins: [],
}

var popupConfig = Object.assign({}, config, {
  name: "popup",
  entry: {
    popup: path.resolve("./src/popup/popup.ts"),
  },
  output: {
    path: __dirname + `/${out_dir}/popup`,
    filename: "[name].js",
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: "./src/popup/popup.html",
      filename: "./popup.html",
    }),
  ],
})

var olimpConfig = Object.assign({}, config, {
  name: "olimp",
  entry: {
    olimp: path.resolve("./src/content_script/olimp.ts"),
  },
  output: {
    path: __dirname + `/${out_dir}/content_script`,
    filename: "[name].js",
  },
})

var backConfig = Object.assign({}, config, {
  name: "back",
  entry: {
    back: path.resolve("./src/back/main.ts"),
  },
  output: {
    path: __dirname + `/${out_dir}`,
    filename: "[name].js",
  },
})

module.exports = [backConfig, olimpConfig, popupConfig]
