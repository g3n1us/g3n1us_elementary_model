const path = require('path');

module.exports = {
  entry: './src/Model.js',
  output: {
    filename: 'ElementaryModel.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: "umd",
		library: "ElementaryModel"
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }]
  }
};
