const { developmentChains, networkConfig } = require("../../helper-hh-config")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai") // to asi nebude mit nic spolecneho s HH apod.

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle - UNIT TEST", function () {
          let raffle,
              raffle2,
              coordinatorV2,
              participant,
              participant2,
              enterFee,
              interval,
              raffleContract,
              accounts

          /* jak je to na githubu..
          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              //   deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["mocks", "raffle"]) // Deploys modules with the tags "mocks" and "raffle"
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock") // Returns a new connection to the VRFCoordinatorV2Mock contract
              raffleContract = await ethers.getContract("Raffle") // Returns a new connection to the Raffle contract
              raffle = raffleContract.connect(player) // Returns a new instance of the Raffle contract connected to player
              raffleEntranceFee = await raffle.getEnterFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("intitiallizes the raffle correctly", async () => {
                  // Ideally, we'd separate these out so that only 1 assert per "it" block
                  // And ideally, we'd make this check everything
                  const raffleState = (await raffle.getRaffleState()).toString()
                  // Comparisons for Raffle initialization:
                  assert.equal(raffleState, "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId]["repeatInterval"]
                  )
              })
          })
          */

          beforeEach(async () => {
              //const { strejdaKarel } = await getNamedAccounts()
              //deployer = (await getNamedAccounts()).participant
              accounts = await ethers.getSigners()
              participant = accounts[1]
              participant2 = accounts[2]
              await deployments.fixture(["all"]) // deploy everything
              raffleContract = await ethers.getContract("Raffle") // deployer - strejdaKarel (accounts[0])
              raffle = raffleContract.connect(participant) // pristupujeme jako ucastnik (accounts[1])
              raffle2 = raffleContract.connect(participant2)
              coordinatorV2 = await ethers.getContract("VRFCoordinatorV2Mock")
              enterFee = await raffle.getEnterFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("Correct initialization via constructor", async () => {
                  // mel by byt jen jeden assert na jeden it..
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0") // udajne vraci uint256 a to je bignumber ale nejak se mi to necuduje
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId]["repeatInterval"]
                  )
              })
          })

          describe("enter the lottery", function () {
              /*it("Raffle has to be open", async function () {
                    await expect(raffle.enterLottery()).to.be.revertedWith("Raffle_ItIsNotOpenDude")
                })  je to open.. uz v constructoru.. */
              it("Minimum entrance fee", async () => {
                  await expect(raffle.enterLottery()).to.be.revertedWith(
                      "Raffle__TooLowEnterFeeYouFuck"
                  )
              })
              it("Save multiple participants to array", async () => {
                  await raffle.enterLottery({ value: enterFee })
                  await raffle2.enterLottery({ value: enterFee })
                  const playerAddress = await raffle.getParticipant(0)
                  const playerAddress2 = await raffle.getParticipant(1)
                  assert.equal(playerAddress, participant.address)
                  assert.equal(playerAddress2, participant2.address)
              })
              it("Emit event", async () => {
                  // testuju emit eventu, v zavorce contract a jmeno eventu
                  await expect(raffle.enterLottery({ value: enterFee })).to.emit(
                      raffle,
                      "NewLotteryEnter"
                  )
              })
              it("Cannot enter while calculating winner", async () => {
                  await raffle.enterLottery({ value: enterFee })
                  await raffle2.enterLottery({ value: enterFee }) // v contractu vyzaduji min dva hrace
                  // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 20]) // zmenime cas blockchainu (zvysime nas interval o 1 a tim bude podminka splnena)
                  await network.provider.request({ method: "evm_mine", params: [] }) // vytezime novy blok (jinak se cas nezvysi..), to same dela:
                  //await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([]) // pretending to be a chainlink keeper (a vkladam prazdne calldata [] nebo 0x)
                  //state se zmenil na calculating
                  await expect(raffle.enterLottery({ value: enterFee })).to.be.revertedWith(
                      "Raffle__ItIsNotOpenDude"
                  )
              })
          })
          describe("checkUpkeep test", function () {
              it("false if no participants and no eth", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 2])
                  await network.provider.send("evm_mine", [])
                  //normalne bych u public view fce musel provest transakci! ale muzu ziskat vystupy i jinak:
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]) // CALLSTATIC umozni odeslat vystupy, aniz bych provadel transakci
                  assert(!upkeepNeeded) // !false == true ..
              })
              it("false if isnt open", async () => {
                  await raffle.enterLottery({ value: enterFee })
                  await raffle2.enterLottery({ value: enterFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 2])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep("0x")
                  const raffleState = await raffle2.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
                  assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
              })
              it("false if not passed time", async () => {
                  await raffle.enterLottery({ value: enterFee })
                  await raffle2.enterLottery({ value: enterFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("return true if everything is perfecto eno nuno", async () => {
                  await raffle.enterLottery({ value: enterFee })
                  await raffle2.enterLottery({ value: enterFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 2])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                  assert(upkeepNeeded)
              })
          })
          describe("PerformUpKeep testing", function () {
              it("Only run if checkup is true", async () => {
                  await raffle.enterLottery({ value: enterFee })
                  await raffle2.enterLottery({ value: enterFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 2])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("Reverts if checkup is false when not correct timestamp", async () => {
                  await raffle.enterLottery({ value: enterFee })
                  await raffle2.enterLottery({ value: enterFee })
                  // vlozil sem dva idioty a tudiz timestamp bude 4 (2x connect a dve transakce)
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 4]) // upravim na 109 (podminka fce je >= 110)
                  await network.provider.send("evm_mine", [])
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
                      "Raffle__NotTheRightTime(109, 2, 0, 20000000000000000)"
                  )
                  // nemusim specifikovat jednotlive hodnoty.. ale ted je to supr test (az na to ze jsou hardcoded..)
              })
              it("Update lottery state to calculate, emit event, calls vrfcooordinatorv2", async () => {
                  await raffle.enterLottery({ value: enterFee })
                  await raffle2.enterLottery({ value: enterFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 2])
                  await network.provider.send("evm_mine", [])
                  const raffleStateBefore = await raffle2.getRaffleState() // 0
                  const txRes = await raffle.performUpkeep("0x") // tady uz neni staticcall, nevytahujeme vystup
                  const txRec = await txRes.wait(1)
                  const raffleStateAfter = await raffle.getRaffleState() // should be 1
                  const requestId = txRec.events[1].args.requestId // nebude to 0 event ale 1 protoze uz fce "requestRandomWords" jeden emituje..!!!
                  assert(requestId.toNumber() > 0)
                  assert(raffleStateBefore.toString() == "0") // proc taky nejde toNumber??!!
                  assert(raffleStateAfter.toString() == "1")
              })
          })
          describe("Testing of fulfillRandomWords functionality", function () {
              // pred kazdym it splnit pocet lidi a timestamp..
              beforeEach(async () => {
                  await raffle.enterLottery({ value: enterFee })
                  await raffle2.enterLottery({ value: enterFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 2])
                  await network.provider.send("evm_mine", [])
              })
              it("only can be called after performUpkeep..", async () => {
                  // vyzkousime volat fci primo z kontractu VRFcoordinatoruV2 s ruznym requestId
                  await expect(
                      coordinatorV2.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      coordinatorV2.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
              })
              it("Choose winner / send money to his account / reset this fucking shit", async () => {
                  // pridame dalsi hromadku ucastniku
                  const howMuch = 4
                  const startAt = 3 // 0 deploy, 1,2 uz tam jsou (beforeeach)
                  // i=3, i<7 (7-3=4)
                  for (let i = startAt; i < startAt + howMuch; i++) {
                      const raffle = raffleContract.connect(accounts[i])
                      await raffle.enterLottery({ value: enterFee })
                  }
                  const startTimeStamp = await raffle.getRecentTimestamp() // timestamp blocku kde se pridal posledni hrac a zaroven pocatecni cas
                  // performUpkeep ( mock being LINK keepers) - predstiram
                  // fullfillrandomwords ( mock being LINK VRF)
                  // simulate waiting for the fullfillrandomwords to be called
                  // na testnetu na to totiz taky musime cekat, nez se to vyplni..

                  // to simulate this waiting for emit the event, we have to set up a listener
                  // nemuzeme ukoncit ten test nez listener dokonci listening
                  // takze vytvorime Promise
                  await new Promise(async (resolve, reject) => {
                      // listen for this "WeHaveNewWinnerBitches" event
                      // once it get emitted, do something
                      // je to fce ethers "provider.once / contract.once"
                      // umoznuje "poslouchat" jestli se dana vec vykonala a pak neco provest

                      raffle.once("WeHaveNewWinnerBitches", async () => {
                          // inside here will be all of our asserts!
                          console.log("EVENT FOUNDED - winner picked! haleluja")

                          try {
                              const recentWinner = await raffle.getRecentWinner()

                              /*console.log(recentWinner)
                              console.log(accounts[0].address)
                              console.log(accounts[1].address)
                              console.log(accounts[2].address)
                              console.log(accounts[3].address)
                              console.log(accounts[4].address)
                              console.log(accounts[5].address)
                              console.log(accounts[6].address)
                              tady jsme zjistili, ze account 6 je winner (pri kazdem zavolani..)
                              */

                              const raffleState = await raffle.getRaffleState()
                              const endTimeStamp = await raffle.getRecentTimestamp()
                              const numberOfParticipants = await raffle.getNumberOfParticipants()
                              await expect(raffle.getParticipant(2)).to.be.reverted
                              assert.equal(numberOfParticipants.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endTimeStamp > startTimeStamp)

                              assert.equal(recentWinner.toString(), accounts[6].address)
                              const endingBallance = await accounts[6].getBalance()
                              assert.equal(
                                  endingBallance.toString(),
                                  startingBalance
                                      .add(enterFee.mul(howMuch).add(enterFee.mul(2)))
                                      .toString()
                              )

                              resolve()
                          } catch (e) {
                              reject(e) // kdyz to bude pres 200 sekund tak error..
                          }

                          // resolve() // kdyz ne tak vyreseno
                      })
                      // setting up listener
                      // a tady uvnitr promise budu volat funkce jako mock
                      // we will fire the event, listener will pick it up and resolve it
                      const txRes = await raffle.performUpkeep("0x")
                      const txRec = await txRes.wait(1)

                      // jelikoz uz vim, kdo je winner, tak si ulozim kolik mel predtim
                      const startingBalance = await accounts[6].getBalance()

                      // zavolam fci z mocku (vstupni parametry jsou requestid a consumer address)
                      await coordinatorV2.fulfillRandomWords(
                          txRec.events[1].args.requestId,
                          raffle.address
                      )
                      // ta zavolala nasi fci "fulfillRandomWords" a emitnula event "WeHaveNewWinnerBitches"
                      // takze listener to pozna a rozjede party nahore v "raffle.once"..

                      // klidne bysme mohli dat vsechny asserts sem, ale musime nasimulovat testnet
                  })
                  // kdybych je (mocky) zavolal mimo promise, tak by se nikdy nevytvoril ten event a promise by se nikdy nevykonal..
                  // mega srozumitelne co? :D
              })
          })
      })
