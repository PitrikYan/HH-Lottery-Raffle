const { run } = require("hardhat")

//async function verify(contractAddress, args) {    fci muzu deifnovat takto
// nebo i jako promennou takto, dela to to same.. promenna tam byt nemusi, ale neslo by to pak volat..
const verify = async (contractAddress, args) => {
    // args => constructor.. (a kvuli verify importujeme "run")
    console.log("Here we go.. VERIFY THIS!!")
    try {
        // zkus
        await run("verify:verify", {
            // task:subTask , { params ze vstupu }
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e) {
        // chytit errory
        if (e.message.toLowerCase().includes("already verified")) {
            // jestlize error prevedeny na male pismena obsahuje..
            console.log("catch it! Contract already verified!")
        } else {
            console.log(e)
        }
    }
    // cele to "try" tu byt nemusi, ale..
    // kdyby uz byl verified (coz casto muze byt) tak je to v pejci - cely script by skoncil! a to my co? to my nechceme preci
    // takze si osefuju errory
}

module.exports = { verify }
