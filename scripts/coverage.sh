#!/bin/bash

rm -fr ./coverage

mkdir ./coverage

node \
  --import=tsx \
  --experimental-test-coverage \
  --test-reporter=spec --test-reporter-destination=stdout \
  --test-reporter=lcov --test-reporter-destination=./coverage/lcov.info \
  --test tests/**/*.test.*
