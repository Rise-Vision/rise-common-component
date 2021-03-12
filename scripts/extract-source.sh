mkdir -p dist

COMPONENT_SOURCE=dist/$1.js

cat build/prod/html/index.html | perl -pe 's!.*<script>(.*'$1'.*)</script>.*!$1!' > $COMPONENT_SOURCE

if [ $(wc -l < $COMPONENT_SOURCE) -gt 1 ]
then
  echo malformed output script - too many lines >&2

  exit 1
fi

if [ $(grep -c '^define' $COMPONENT_SOURCE) -eq 0 ]
then
  echo malformed output script - not JavaScript transpiled code >&2

  exit 1
fi

sed 's|../shared_bundle_1.js|https://widgets.risevision.com/stable/common/polymer-bundle.min.js|' $COMPONENT_SOURCE > dist/$1-bundle.min.js
