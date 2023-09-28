import { useEffect, useState } from "react";
import { Proof } from '@reclaimprotocol/reclaim-sdk'
import { useContractWrite, usePrepareContractWrite } from 'wagmi';
import { ethers } from "ethers";
import contractABI from '../assets/gcoinABI.json';
import { Identity } from "@semaphore-protocol/identity";
import { Airdrop } from "./airdrop.component";

export function Register({proofObj, userAddr}: {proofObj: Proof, userAddr: string}) {

    const [identity, setIdentity] = useState<Identity>();
    const [isPrepared, setIsPrepared] = useState(false);

    useEffect(() => {
        if (!identity) {
            const newIdentity = new Identity();
            setIdentity(newIdentity);
            console.log("Generated new identity: ", newIdentity);
        }
    }, [identity]);


    const GCoinAddress = '0xe74DdeAC3a394FAf9D37110DAd1Fc405D888252d';

    const claimData = {
        identifier: proofObj.identifier,
        owner: ethers.computeAddress(`0x${proofObj.ownerPublicKey}`),
        epoch: proofObj.epoch,
        timestampS: Number(proofObj.timestampS)
    }
    // console.log("The claim data is: ", claimData);

    // console.log("The args are: ", [[proofObj.epoch, proofObj.provider, proofObj.parameters, proofObj.context, claimData, proofObj.signatures, identity?.commitment]]);

    const { config } = usePrepareContractWrite({
        enabled:!!identity,
        address: GCoinAddress,
        abi: contractABI,
        functionName: 'verifyProofAndRegisterMember',
        args: [proofObj.epoch, proofObj.provider, proofObj.parameters, proofObj.context, claimData, proofObj.signatures, identity?.commitment],
        chainId: 420,
        onSuccess(data) {
            console.log(identity);
            console.log('Successful - register prepare: ', data);
            setIsPrepared(true);
        },
        onError(error) {
            console.log('Error in verify Proof: ', error);
            // window.alert('Error: Try by manually switching network to Optimism Goerli testnet.\nRPC: https://goerli.optimism.io\nChain Id: 420\ncheck console.log if this doesn\'t work either.')
        }
    });

    const contractWrite = useContractWrite(config);
    return (
        <>
            {/* { // verify proof on chain and register identity
                !contractWrite.isSuccess &&
                <div className='button-container' onLoad={() => { contractWrite.write?.()}}>
                    <div>Verifying proofs and registering identity</div>
                    <div className="loading-spinner"/>
                </div>
            } */}
            { !contractWrite.isSuccess &&
            <div className='button-container'>
                <button
                    className="glow-on-hover"
                    onClick={()=>{ contractWrite.write?.() }}
                    disabled={contractWrite.isLoading || contractWrite.isSuccess || !isPrepared}
                >
                    Verify Reclaim Proof &
                    <br/>
                    Register Semaphore Identity
                </button>
                {contractWrite.isLoading && <div className='loading-spinner'/>}
            </div>
        }

            { // Airdrop
                true && 
                // <div>
                //     <div>Transaction Hash: {contractWrite.data?.hash}</div><br/>
                //     <div>Import G-Coins from: {GCoinAddress}</div>
                // </div>
                <Airdrop identity={identity!} userAddrSignal={userAddr} shouldRender = {contractWrite.isSuccess}/>
            }
        </>
    )
}