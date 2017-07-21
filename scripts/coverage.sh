#! /bin/bash

output=$(nc -z localhost 8555; echo $?)
[ $output -eq "0" ] && trpc_running=true
if [ ! $trpc_running ]; then
  testrpc -p 8555 --gasLimit 0xfffffffffff > /dev/null &
  trpc_pid=$!
fi
./node_modules/.bin/solidity-coverage
if [ ! $trpc_running ]; then
  kill -9 $trpc_pid
fi
