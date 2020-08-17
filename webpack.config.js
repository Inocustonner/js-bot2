// common configuration
const path = require('path');
const out_dir = 'extension'

var config = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  devtool: "inline-source-map"
}

var olimpConfig = Object.assign({}, config, {
  name: "olimp",
  entry: {
    olimp: path.resolve("./src/content_script/olimp.js"),
  },
  output: {
    path: __dirname + `/${out_dir}/content_script`,
    filename: '[name].js'
  }
})

var backConfig = Object.assign({}, config, {
  name: "back",
  entry: {
    back: path.resolve("./src/back/main.ts"),
  },
  output: {
    path: __dirname + `/${out_dir}`,
    filename: "[name].js"
  }
})


module.exports = [
  backConfig,
  olimpConfig
];
