#!/usr/bin/env sh
# Runs the heat model tests without Unity. Needs Mono (mcs + mono): sudo apt install mono-devel
set -e
cd "$(dirname "$0")"
mkdir -p bin
mcs -nologo -out:bin/HeatModelTests.exe HeatModelTests.cs ../Assets/HeatCheck/Scripts/Model/HeatModel.cs
mono bin/HeatModelTests.exe
