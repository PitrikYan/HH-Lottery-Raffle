const { network, ethers, getNamedAccounts, run } = require("hardhat")
const { networkConfig, developmentChains, FUND_VRF_SUB } = require("../helper-hh-config") // tohle je to same jako toto: (akorat na jednom radku vytahneme primo tu promennou)
//const helperConfig = require("../helper-hh-config") - cely soubor
//const networkConfig = helperConfig.networkConfig - vytahnuti promenne

const { verify } = require("../utils/verify")

/*
// hre - HH runtime environments - davame jako parametr fce
async function deployFunc(hre) {
    console.log("zdarec vole")
    hre.getNamedAccounts
    hre.deployments
}
// budeme tuto fci exportovat jako defaultni pro HH deploy:
module.exports.default = deployFunc

//je to vesmes to same jako tohle:
*/

/*
module.exports = async (hre) => {
    const {getNamedAccounts, deployments} = hre  // vytahneme jen nektere promenne z "hre" a toto by delalo to same:
    // hre.getNamedAccounts
    // hre.deployments
}

// a uplne to same dela i tohle:
getNamedAccounts, deployments jsou HH runtime environments
*/

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { strejdaKarel } = await getNamedAccounts()
    const chainId = network.config.chainId

    // poresim jestli mam adresu V2Coordinatoru tahat z mocku nebo z configu..
    let vrfCoordinatorV2Address, subscribtionId
    // jsem na local nebo testnetu?
    if (developmentChains.includes(network.name)) {
        const lastCoordinatorV2 = await ethers.getContract("VRFCoordinatorV2Mock") // slo by i "deployments.get()", ziskava posledni deploy mocku (recently deployed)
        vrfCoordinatorV2Address = lastCoordinatorV2.address
        // ted jak na subscriptionID bez https://vrf.chain.link/rinkeby/8223
        const txResponse = await lastCoordinatorV2.createSubscription()
        const txReceipt = await txResponse.wait(1)
        subscribtionId = txReceipt.events[0].args.subId // vytahnu event ktery emitnula fce createSubscription a z nej grabnu subId!
        // dal tam potrebuju nacpat nejaky link
        await lastCoordinatorV2.fundSubscription(subscribtionId, FUND_VRF_SUB)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"] // TESTNET - ctu adresu z helper configu na zaklade chainid
        subscribtionId = networkConfig[chainId]["subscriptionId"] // ziskano z UI chainlinku
    }

    // DEPLOY
    // args - vstupni promenne do constructoru Raffle
    const entranceFee = networkConfig[chainId]["entranceFee"].toString()
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const repeatInterval = networkConfig[chainId]["repeatInterval"]

    /*console.log(vrfCoordinatorV2Address)
    console.log(entranceFee)
    console.log(gasLane)
    console.log(subscribtionId)
    console.log(callbackGasLimit)
    console.log(repeatInterval)*/

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscribtionId,
        callbackGasLimit,
        repeatInterval,
    ]

    const raffleContract = await deploy("Raffle", {
        from: strejdaKarel,
        args: args, // price feed address
        log: true, // vypise info o deploy do logu (tx, address, gas)
        waitConfirmations: network.config.blockConfirmations || 1, // we need to wait if on a live network so we can verify properly
    })

    // VERIFY (kdyz nejsme na localu.. ale na testnetu) a zaroven je k dispozici API
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API) {
        // vytvorime si "utils" folder (spolecne fce pro vice scriptu)
        // vytvorime "verify" a importujeme

        await verify(raffleContract.address, args)
    }

    log("___________________________________________________________________________")
}

module.exports.tags = ["all", "raffle"] // diky tomuhle muzu deploynout jen fundme (zadam napr do konzole) a nebo "all" (vsude kde je all se deployne)
