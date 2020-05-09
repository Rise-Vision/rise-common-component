COMPONENT_NAME=$1
TARGET=$2

gsutil cp dist/$COMPONENT_NAME.js $TARGET
gsutil -m setmeta -r -h "Cache-Control:private, max-age=600" $TARGET
gsutil acl -r ch -u AllUsers:R $TARGET
