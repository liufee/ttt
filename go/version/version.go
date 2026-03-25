package version

import "runtime"

var (
	GoGitHash   = ""
	GoBuildDate = ""
)

func VersionGoGitHash() string {
	return GoGitHash
}

func VersionGOBuildDate() string {
	return GoBuildDate
}

func VersionGOVersion() string {
	return runtime.Version()
}
