require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    livenet: {
      host: "localhost",
      port: 8546,
      network_id: "1" // Match any network id
    },
    development: {
      host: "localhost",
      port: 8545,
      gas: 10000000,
      network_id: "*" // Match any network id
    }
  }
};
