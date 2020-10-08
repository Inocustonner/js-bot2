// common configuration
const path = require("path")
const HtmlWebPackPlugin = require("html-webpack-plugin")
const { nodeName } = require("jquery")

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

var TimedMapTestConfig = Object.assign({}, config, {
  name: "test-timed-map",
  entry: {
    back: path.resolve("./test/timed-map-test/test.ts"),
  },
  output: {
    path: path.resolve(__dirname, "test/timed-map-test/"),
    filename: "test.js",
  },
})

var timerClockTest = Object.assign({}, config, {
  name: "timer-clock-test",
  entry: {
    back: path.resolve("./test/timer-clock-test/test.ts"),
  },
  output: {
    path: path.resolve(__dirname, "test/timer-clock-test/"),
    filename: "test.js",
  },
})

module.exports = [backConfig, olimpConfig, popupConfig]
