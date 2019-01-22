#! /bin/bash

MANA_TOKEN=MANAToken.sol
MANA_CONTINUOUS_SALE=MANAContinuousSale.sol
MANA_CROWDSALE=MANACrowdsale.sol

OUTPUT=full

npx truffle-flattener contracts/$MANA_TOKEN > $OUTPUT/$MANA_TOKEN
npx truffle-flattener contracts/$MANA_CONTINUOUS_SALE > $OUTPUT/$MANA_CONTINUOUS_SALE
npx truffle-flattener contracts/$MANA_CROWDSALE > $OUTPUT/$MANA_CROWDSALE
