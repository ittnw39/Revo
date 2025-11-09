const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// 환경에 따른 publicPath 설정
const isProduction = process.env.NODE_ENV === 'production';
const publicPath = isProduction ? '/Revo/' : '/';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: {
    main: './index.web.js',
  },
  output: {
    path: path.resolve(__dirname, 'web-build'),
    filename: '[name].js',
    chunkFilename: '[name].[contenthash].js',
    publicPath: publicPath,
    clean: true,
  },
  resolve: {
    extensions: ['.web.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      'react-native$': 'react-native-web',
      'react-native-svg': 'react-native-svg-web',
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            configFile: true,
            envName: 'web',
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]',
        },
      },
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: true,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public/manifest.json',
          to: 'manifest.json',
        },
        {
          from: 'public/sw.js',
          to: 'sw.js',
        },
        {
          from: 'public/icon-192.png',
          to: 'icon-192.png',
        },
        {
          from: 'public/icon-512.png',
          to: 'icon-512.png',
        },
        {
          from: 'public/favicon.svg',
          to: 'favicon.svg',
        },
      ],
    }),
    new webpack.ProvidePlugin({
      React: 'react',
    }),
    // 환경변수 주입 (빌드 타임에 주입됨)
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_URL': JSON.stringify(
        process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
      ),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: {
      index: '/index.html',
    },
    open: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
};