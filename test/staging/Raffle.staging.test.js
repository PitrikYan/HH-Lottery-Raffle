const { developmentChains, networkConfig } = require("../../helper-hh-config")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai") // to asi nebude mit nic spolecneho s HH apod.

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle - STAGING TEST", function () {
          let raffle, enterFee, raffleContract

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).strejdaKarel
              raffle = await ethers.getContract("Raffle", deployer)
              enterFee = await raffle.getEnterFee()
          })

          describe("Testing of fulfillRandomWords functionality", function () {
              it("Choose winner / send money to his account / reset this fucking shit ON TESTNET - REAL LINK KEEPERS AND VRF", async () => {
                  console.log("Setting up test...")
                  const startTimeStamp = await raffle.getRecentTimestamp()
                  accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WeHaveNewWinnerBitches", async () => {
                          console.log("EVENT FOUNDED - winner picked! haleluja")

                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const endTimeStamp = await raffle.getRecentTimestamp()
                              const numberOfParticipants = await raffle.getNumberOfParticipants()
                              const endingBallance = await accounts[0].getBalance()

                              await expect(raffle.getParticipant(0)).to.be.reverted

                              assert.equal(numberOfParticipants.toString(), "0")

                              assert.equal(raffleState, 0)

                              assert(endTimeStamp > startTimeStamp)

                              assert.equal(recentWinner.toString(), accounts[0].address)

                              assert.equal(
                                  endingBallance.toString(),
                                  startingBalance.add(enterFee).toString()
                              )

                              resolve() // tohle ukonci listening, dokonano jest
                          } catch (e) {
                              console.log(e)
                              reject(e) // mame problem hustone
                          }
                      })
                      // enter lottery!
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterLottery({ value: enterFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const startingBalance = await accounts[0].getBalance()
                  })
              })
          })
      })
