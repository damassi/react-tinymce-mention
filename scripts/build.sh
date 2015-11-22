#!/bin/sh -e

babel=node_modules/.bin/babel
webpack=node_modules/.bin/webpack
build_dir=lib

git clean -f $build_dir

$babel ./src -d $build_dir --ignore "__tests__" --stage 0

$webpack --config webpack.dist.js

echo "gzipped, the global build is `gzip -c $build_dir/umd/plugins/mention/plugin.min.js | wc -c | sed -e 's/^[[:space:]]*//'` bytes"
