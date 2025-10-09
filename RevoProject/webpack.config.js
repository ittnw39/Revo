const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './index.web.js',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'public'),
    hot: true,
    port: 3000,
  },
  module: {
    rules: [
      // 🔹 Babel 트랜스파일 (ESM 모듈 포함)
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules\/(?!(@react-navigation|react-native|react-native-web|react-native-gesture-handler|react-native-reanimated)\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-transform-runtime',
            ],
          },
        },
      },

      // 🔹 PNG, JPG 등 asset 처리 (더 구체적인 설정)
      {
        test: /\.(png|jpe?g|gif|webp|jpg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]',
        },
      },

      // 🔹 SVG → React 컴포넌트
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
    ],
  },

  resolve: {
    alias: {
      'react-native$': 'react-native-web',
    },
    extensions: [
      '.web.js',
      '.js',
      '.web.ts',
      '.ts',
      '.web.tsx',
      '.tsx',
      '.json',
    ],

    /**
     * ⚡ 여기서 모든 ESM fully-specified 에러 해결
     */
    extensionAlias: {
      '.js': ['.js', '.ts', '.tsx'], // js import 시 ts도 허용
    },
    fullySpecified: false,
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
