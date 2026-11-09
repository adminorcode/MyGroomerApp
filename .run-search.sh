#!/bin/bash
cd "/c/Users/lucas/source/repos/MyGroomer/React App"
OUT=/c/Users/lucas/source/repos/MyGroomer/infra/logs/suite-search.txt; : > $OUT
for spec in tutor-search mix-09-busca mix-10-servicos visual-discovery-alignment visual-tutor-alignment tutor-addresses mix-16-endereco-form; do timeout 600 node --import ./e2e/preload.mjs e2e/$spec.mjs > /tmp/out-s-$spec.txt 2>&1; echo "$spec exit=$?" >> $OUT; done
echo SUITE_DONE >> $OUT
