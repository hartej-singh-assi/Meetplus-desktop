#!/bin/bash
# MeetPulse Desktop Standalone Native App Launcher
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Resolve Node.js binary path for GUI execution (GNOME / Ubuntu Application Launcher)
if ! command -v node &> /dev/null; then
    for node_dir in \
        "$HOME/.local/share/fnm/node-versions/v24.18.0/installation/bin" \
        "$HOME/.local/share/fnm/current/bin" \
        "$HOME/.nvm/versions/node/v24.15.0/bin" \
        $(find "$HOME/.local/share/fnm/node-versions" "$HOME/.nvm/versions/node" -maxdepth 3 -type d -name "bin" 2>/dev/null); do
        if [ -x "$node_dir/node" ]; then
            export PATH="$node_dir:$PATH"
            break
        fi
    done
fi

# Launch native Electron desktop application window directly with Linux sandbox compatibility
./node_modules/.bin/electron . --no-sandbox "$@"

