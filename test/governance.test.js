const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { helpers, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Governance", function () {
  let governance, autID, dao, daoTypes, deployer, daoMember, notAMember;
  const username = "Username";
  const URL = "https://someurl.com";

  beforeEach(async () => {
    [deployer, daoMember, notAMember, ...addrs] = await ethers.getSigners();

    const AutID = await ethers.getContractFactory("AutID");
    autID = await upgrades.deployProxy(AutID, [deployer.address], {
      from: deployer,
    });
    await autID.deployed();

    const DAO = await ethers.getContractFactory("SWLegacyDAO");
    dao = await DAO.deploy();
    await dao.deployed();
    await dao.addMember(deployer.address);

    const DAOTypes = await ethers.getContractFactory("DAOTypes");
    daoTypes = await DAOTypes.deploy();
    await daoTypes.deployed();

    const SWLegacyMembershipChecker = await ethers.getContractFactory(
      "SWLegacyMembershipChecker"
    );

    sWLegacyMembershipChecker = await SWLegacyMembershipChecker.deploy();
    await sWLegacyMembershipChecker.deployed();

    daoTypes.addNewMembershipChecker(sWLegacyMembershipChecker.address);

    const ModuleRegistryFactory = await ethers.getContractFactory(
      "ModuleRegistry"
    );
    const moduleRegistry = await ModuleRegistryFactory.deploy();

    const PluginRegistryFactory = await ethers.getContractFactory(
      "PluginRegistry"
    );
    pluginRegistry = await PluginRegistryFactory.deploy(moduleRegistry.address);

    const DAOExpander = await ethers.getContractFactory("DAOExpander");

    daoExpander = await DAOExpander.deploy(
      deployer.address,
      autID.address,
      daoTypes.address,
      1,
      dao.address,
      1,
      URL,
      5,
      pluginRegistry.address
    );

    await daoExpander.deployed();

    await dao.addMember(deployer.address);
    await dao.addMember(daoMember.address);

    await autID
      .connect(daoMember)
      .mint(username, URL, 3, 8, daoExpander.address);

    Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.connect(deployer).deploy(daoExpander.address);
    await governance.deployed();
  });

  it("should create a new proposal", async function () {
    const blockNumber = await ethers.provider.getBlockNumber();
    block = await ethers.provider.getBlock(blockNumber);

    const start = block.timestamp;
    const end = block.timestamp + 1000;

    await governance.connect(deployer).createProposal(start, end, "testCID");

    expect(await governance.getProposalCount()).to.equal(1);

    const [metadataCID, startTime, endTime, yesVotes, noVotes] =
      await governance.getProposal(0);
    expect(metadataCID).to.equal("testCID");
    expect(startTime).to.equal(start);
    expect(endTime).to.equal(end);
    expect(yesVotes).to.equal(0);
    expect(noVotes).to.equal(0);

    expect(await governance.getActiveProposalIDs()).to.be.eql([
      ethers.BigNumber.from(0),
    ]);
  });

  it("should compute vote weight per role correctly", async function () {
    const wtRole1 = await governance.callStatic.weightPerRole(1);
    const wtRole2 = await governance.callStatic.weightPerRole(2);
    const wtRole3 = await governance.callStatic.weightPerRole(3);
    const wtRole4 = await governance.callStatic.weightPerRole(4);

    expect(wtRole1).to.equal(10);
    expect(wtRole2).to.equal(21);
    expect(wtRole3).to.equal(18);
    expect(wtRole4).to.equal(0);
  });

  it("should allow voting on a proposal", async function () {
    const blockNumber = await ethers.provider.getBlockNumber();
    block = await ethers.provider.getBlock(blockNumber);

    const start = block.timestamp;
    const end = block.timestamp + 1000;

    await governance.connect(daoMember).createProposal(start, end, "testCID");
    await governance.connect(daoMember).vote(0, true);

    const [, , endTime, yesVotes, noVotes] = await governance.getProposal(0);
    expect(endTime).to.equal(endTime);
    expect(yesVotes).to.equal(18);
    expect(noVotes).to.equal(0);
  });

  it("should not allow voting on a proposal outside proposal duration", async function () {
    const blockNumber = await ethers.provider.getBlockNumber();
    block = await ethers.provider.getBlock(blockNumber);
    const start = block.timestamp;
    const end = block.timestamp + 1000;

    await governance.connect(deployer).createProposal(start, end, "testCID");

    await time.increaseTo(end + 2000);

    await expect(governance.connect(deployer).vote(0, false)).to.revertedWith(
      "Invalid voting time"
    );
  });

  it("should not allow to create proposals by non-members", async function () {
    const blockNumber = await ethers.provider.getBlockNumber();
    block = await ethers.provider.getBlock(blockNumber);
    const start = block.timestamp;
    const end = block.timestamp + 1000;

    await expect(
      governance.connect(notAMember).createProposal(start, end, "testCID")
    ).to.revertedWith("Only DAO members allowed");
  });

  it("should not allow to vote on proposals by non-members", async function () {
    const blockNumber = await ethers.provider.getBlockNumber();
    block = await ethers.provider.getBlock(blockNumber);

    const start = block.timestamp;
    const end = block.timestamp + 1000;

    await governance.connect(deployer).createProposal(start, end, "testCID");
    await expect(governance.connect(notAMember).vote(0, true)).to.revertedWith(
      "Only DAO members allowed"
    );
  });
});
