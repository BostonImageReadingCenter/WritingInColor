#!/bin/bash

bun run webpack --mode $1 || (bun install webpack && bun run webpack --mode $1)
sass client/static/scss:client/static/css

