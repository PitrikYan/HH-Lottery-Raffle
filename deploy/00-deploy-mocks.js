const { network } = require("hardhat")
const { developmentChains, GAS_PRICE_LINK, BASE_FEE } = require("../helper-hh-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { strejdaKarel } = await getNamedAccounts()
    //const chainId = network.config.chainId

    if (developmentChains.includes(network.name)) {
        // .includes -> zjisti zda pole obsahuje tuto promennou! pole vypada takto ["hardhat", "localhost"]
        // misto toho by stacilo i "if (chainId == "31337")"
        log("You are on local network! Deploying mocks..")
        await deploy("VRFCoordinatorV2Mock", {
            //contract: "VRFCoordinatorV2Mock",
            from: strejdaKarel,
            log: true, // vypise info o deploy do logu (tx, address, gas)
            args: [BASE_FEE, GAS_PRICE_LINK],
        })
        log("Mocks Deployed!")
        log("------------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"] // diky tomuhle muzu deploynout jen mocks a nebo "all" (vsude kde je all se deployne)
