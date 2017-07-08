var ConvertLib = artifacts.require("./ConvertLib.sol");
var Crowdsale = artifacts.require("./Crowdsale.sol");

module.exports = function(deployer) {
  deployer.deploy(Crowdsale);
};
