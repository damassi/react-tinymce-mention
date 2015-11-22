const path = require('path')
const webpack = require('webpack')

module.exports = {
  devtool: 'inline-source-map',

  devServer: {
    headers: { 'Access-Control-Allow-Origin': '*' }
  },

  entry: [
    'webpack-dev-server/client?http://localhost:3333',
    './src/index'
  ],

  output: {
    path: path.join(__dirname, 'lib/umd/plugins/mention'),
    filename: 'plugin.js',
    publicPath: '/static/'
  },

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      '__DEV__': true
    })
  ],

  resolve: {
    extensions: ['', '.js', '.jsx'],
    root: [
      path.resolve('./src')
    ],
    modulesDirectories: [
      'node_modules'
    ]
  },

  module: {
    loaders: [{
      test: /\.jsx?$/,
      loaders: ['babel'],
      exclude: /node_modules/,
      include: path.join(__dirname, 'src')
    }]
  }
}
