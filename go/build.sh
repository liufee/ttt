scriptDir=$(cd "$(dirname "$0")"; pwd)
cd $scriptDir

dstDirectory=${scriptDir}/../android/app/libs/
aarName=golib.aar
arrNameWithoutAar="${aarName%.aar}"

rm -rf ${dstDirectory}/$aarName
gomobile bind \
  -target=android -o ${dstDirectory}/$aarName \
  -ldflags "-X feehiapp/version.GoGitHash=$(git rev-parse --short HEAD) \
            -X feehiapp/version.GoBuildDate=$(date '+%Y-%m-%d_%H:%M:%S')" \
  feehiapp/httpserver \
  feehiapp/news \
  feehiapp/qqexmail \
  feehiapp/util \
  feehiapp/srv \
  feehiapp/version

rm -rf ${dstDirectory}/${arrNameWithoutAar}-sources.jar
echo "Done. ${dstDirectory}/$aarName"

