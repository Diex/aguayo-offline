#!/bin/sh
# Finder opens .command files in Terminal; resolve paths relative to this file.
set -eu
PROJECT_DIR=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
open "$PROJECT_DIR/tools/panel_editor/index.html"
