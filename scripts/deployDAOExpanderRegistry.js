// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const autIDAddr = "0xb6868B3920712729A24689Cb5c770639d0C56aDd";
  const daoTypesAddr = "0x814B36802359E0233f38B8A29A96EA9e4c261E37";
  const daoExpanderFactoryAddr = "0xCfEcE12832bDAB04AD11B77ABa091b12fB6C7474";

  const DAOExpanderRegistry = await hre.ethers.getContractFactory(
    "DAOExpanderRegistry"
  );
  const daoExpanderRegistry = await DAOExpanderRegistry.deploy(
    autIDAddr,
    daoTypesAddr,
    daoExpanderFactoryAddr
  );
  await daoExpanderRegistry.deployed();

  console.log('DAOExpanderRegistry', daoExpanderRegistry.address);
  
  const a = await daoExpanderRegistry.getDAOExpanders();
  console.log('daoExpanders', a);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
