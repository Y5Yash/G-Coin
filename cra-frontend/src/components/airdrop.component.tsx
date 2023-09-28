import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { FullProof, generateProof } from "@semaphore-protocol/proof";
import { SemaphoreEthers } from "@semaphore-protocol/data";
import { useEffect, useState } from "react";
import { useContractWrite, usePrepareContractWrite } from "wagmi";
import contractABI from '../assets/gcoinABI.json';

export function Airdrop({identity, userAddrSignal, shouldRender}: {identity: Identity, userAddrSignal: string, shouldRender: boolean}) {

    const [isFullProof, setIsFullProof] = useState(false);
    const [semaphoreProof, setSemaphoreProof] = useState<FullProof>();

    const GCoinAddress = '0xe74DdeAC3a394FAf9D37110DAd1Fc405D888252d';
    const semaphoreAddress = "0x3889927F0B5Eb1a02C6E2C20b39a1Bd4EAd76131";
    const groupNo = 1004;
    const merkleTreeDepth = 16;
    const externalNullifier = "100";
    // const signal = 0;

    useEffect(() => {
        console.log("Should render: ", shouldRender);
    }, [shouldRender]);

    useEffect(() => {
        const generateSemaphoreProof = async () => {
            await new Promise(f => setTimeout(f, 5000));
            if (!isFullProof && shouldRender && !!identity) {
                console.log("The Identity is: ",identity);
                const semaphoreEthers = new SemaphoreEthers("optimism-goerli", {address: semaphoreAddress});
                console.log("Here")
                const members = await semaphoreEthers.getGroupMembers(groupNo.toString());
                console.log("The members are: ", members);
                const group = new Group(groupNo, merkleTreeDepth, members);
                console.log("The group is: ", group);
                // console.log("args for generate proof: ", identity, group, externalNullifier, userAddrSignal, { zkeyFilePath: "../assets/semaphore.zkey", wasmFilePath: "../assets/semaphore.wasm" });
                console.log("identity: ", identity);
                console.log("group: ", group);
                console.log("externalNullifier: ", externalNullifier);
                // console.log("signal: ", signal);
                // console.log("zkeyFilePath: ", "../assets/semaphore.zkey");
                // console.log("wasmFilePath: ", "../assets/semaphore.wasm");

                const fullProof = await generateProof(identity, group, externalNullifier, userAddrSignal );
                console.log("The full semaphore proof is: ", fullProof);
                setSemaphoreProof(fullProof);
                setIsFullProof(true);
            }
        };
        generateSemaphoreProof();
    }, [isFullProof, shouldRender, identity]);


    // console.log("The semaphore proof is: ", semaphoreProof);
    // console.log([[userAddr, semaphoreProof?.merkleTreeRoot, semaphoreProof?.signal, semaphoreProof?.nullifierHash, semaphoreProof?.externalNullifier, semaphoreProof?.proof]]);

    const { config } = usePrepareContractWrite({
        enabled: isFullProof && shouldRender && !!identity,
        address: GCoinAddress,
        abi: contractABI,
        functionName: 'airDropTo',
        args: [ semaphoreProof?.merkleTreeRoot, semaphoreProof?.signal, semaphoreProof?.nullifierHash, semaphoreProof?.externalNullifier, semaphoreProof?.proof],
        chainId: 420,
        onSuccess(data) {
            console.log('Successful - proof prepare: ', data);
        },
        onError(error) {
            console.log('Error in verify Proof: ', error);
            window.alert('Error: Try by manually switching network to Optimism Goerli testnet.\nRPC: https://goerli.optimism.io\nChain Id: 420\ncheck console.log if this doesn\'t work either.')
        }
    });

    const contractWrite = useContractWrite(config);
    
    return (
        <>
            {/* { // verify proof on chain and register identity
                !contractWrite.isSuccess &&
                <div className='button-container' onLoad={() => {!contractWrite.isSuccess && !contractWrite.isLoading && contractWrite.write?.()}}>
                    <div>Airdropping 100 G-Coins</div>
                    <div className="loading-spinner"/>
                </div>
            } */}

            {!contractWrite.isSuccess && shouldRender &&
                <div className='button-container'>
                    <button
                        className="glow-on-hover"
                        onClick={()=>{ contractWrite.write?.() }}
                        disabled={contractWrite.isLoading || contractWrite.isSuccess || !isFullProof}
                    >
                        Verify Semaphore Proof
                        <br/>
                        & Airdrop 100 G-Coins
                    </button>
                    {contractWrite.isLoading && <div className='loading-spinner'/>}
                </div>
            }

            { // Airdrop
                contractWrite.isSuccess &&
                <div>
                    <div>Transaction Hash: <a href={`https://goerli-optimism.etherscan.io/tx/${contractWrite.data?.hash}`} >{contractWrite.data?.hash}</a></div><br/>
                    <div>Import G-Coins from: <a href={`https://goerli-optimism.etherscan.io/address/${GCoinAddress}`}>{GCoinAddress}</a></div>
                </div>
            }
        </>
    )
}