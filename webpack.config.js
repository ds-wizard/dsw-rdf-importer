const path = require('path')
const CopyPlugin = require("copy-webpack-plugin")

module.exports = {
    mode: 'production',
    entry: './src/main.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "public" },
            ],
        }),
    ],
    resolve: {
        fallback: {
            url: false
        }
    },
    devServer: {
        static: {
            directory: path.join(__dirname, '/')
        },
        port: 5000,
        host: 'localhost',
    },
    performance: {
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    },
}
