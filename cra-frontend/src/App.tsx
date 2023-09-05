import { useEffect, useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import QRCode from 'react-qr-code';

import { Register } from './components/register.component';
import { Proof } from '@reclaimprotocol/reclaim-sdk';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

function App() {
  // const ethAddressRegex = /^(0x)?[0-9a-fA-F]{40}$/;
  const backendBase = 'https://codecoin-backend.reclaimprotocol.org';
  const backendTemplateUrl = `${backendBase}/request-proofs`;
  const backendProofUrl = `${backendBase}/get-proofs`;

  const {address, connector, isConnected} = useAccount();
  const { connect, connectors, isLoading, pendingConnector } = useConnect({
    chainId: 420,
    onError(error: Error) {
        console.log("useConnect Error: ", error);
    }
  });

  // State variables
  const [started, setStarted] = useState(false);
  // const [address, setAddress] = useState('');
  // const [validAddress, setValidAddress] = useState(false);
  const [template, setTemplate] = useState('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isTemplateOk, setIsTemplateOk] = useState(true);
  const [isProofReceived, setIsProofReceived] = useState(false);
  const [proofObj, setProofObj] = useState<Proof>();
  const [callbackId, setCallbackId] = useState('');

  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && !isProofReceived && started) {
      console.log('Starting to fetch template.');
      handleGetTemplate();
      const intervalId = setInterval(fetchProof, 4000);
      return () => {
        console.log('Template received/Remounted.');
        clearInterval(intervalId);
      };
    }
  });

  const fetchProof = async () => {
    if (isLoadingTemplate)  {
      console.log('Template is still loading.');
      return;
    }
    try {
      console.log(`Requesting ${backendProofUrl}?id=${callbackId}`);
      const response = await fetch(`${backendProofUrl}?id=${callbackId}`);
      if (response.status === 200) {
        const proofData = await response.json();
        setIsProofReceived(true);
        setProofObj(proofData[0]);
      }
    }
    catch (error) {
      setIsProofReceived(false);
      console.log(error);
    }
  };

  const handleStart = () => {
    // disconnect();
    setStarted(true);
  };

  // const handleAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
  //   setAddress(e.target.value);
  // };

  // const handleAddressSubmit = (e: FormEvent) => {
  //   e.preventDefault();
  //   if (address && !ethAddressRegex.test(address)) {
  //     alert(`Invalid wallet address ${address}`);
  //     return;
  //   }
  //   console.log(address);
  //   setValidAddress(true);
  //   handleGetTemplate();
  // }

  const handleGetTemplate = async () => {
    if (isTemplateOk && template) {
      console.log('The template is already received.');
      return;
    }
    setIsLoadingTemplate(true);
    try {
      console.log(`Requesting ${backendTemplateUrl}?userAddr=${address}`);
      const response = await fetch(`${backendTemplateUrl}?userAddr=${address}`);
      if (response.ok) {
        const data = await response.json();
        if (data?.error) {
          console.log(data.error);
          throw new Error(data.error);
        }
        setCallbackId(data.callbackId);
        setTemplate(data.reclaimUrl);
        setIsTemplateOk(true);
        console.log('The template generated is: ', template);
      }
      else {
        setIsTemplateOk(false);
        setTemplate('Error: Unable to receive a valid template from the backend. Check if it is up and running. Please try again later.');
      }
    }
    catch (error) {
      setIsTemplateOk(false);
      setTemplate('Error: ' + error);
      console.log(error);
    }
    setIsLoadingTemplate(false);
    return;
  };

  return (
    <div className="App">
      <div className='center-body'>
        <div className='leftside-container'>
          <div className='leftside'>
          <h1>G-Coin</h1>
            <h2>Prove that your own a google email ID and get 100 G-Coins.</h2>
            <br/>
            { // Start the G-Coin application
              !started &&
              <div>
                <div>This dApp uses Reclaim Proofs to let you prove that you own a google email ID.</div>
                <div>Follow the steps below once you get started:</div>
                <br/>
                <ol>
                  <li>Connect your wallet</li>
                  <li>Scan the template QR code on Reclaim Wallet</li>
                  <li>Wait for Semaphore Identity Generation & Commitment</li>
                  <li>Wait to receive the airdrop</li>
                </ol> 
                <button onClick={handleStart}>Get Started</button>
              </div>
            }

            { // Enter the wallet address
              started && !template && !isConnected &&
              connectors.map((connector) => (
                <button
                  disabled={!connector.ready || isConnected}
                  key={connector.id}
                  onClick={() => connect({ connector })}
                >
                  {connector.name}
                  {!connector.ready && ' (unsupported)'}
                  {isLoading &&
                    connector.id === pendingConnector?.id &&
                    ' (connecting)'}
                </button>
              ))
            }

            { // If template is not ok
              template && !isTemplateOk && !isProofReceived && 
              <div>{template}</div>
            }

            { // Show the QR code
              started && isConnected && !isProofReceived && template && isTemplateOk &&
              <div>
                <div>Connected to {connector?.name} at {address}</div>
                <br/>
                <div>Scan/Click the QR code to be redirected to Reclaim Wallet.</div>
              </div>
            }

            { // Let the Airdrop component handle the rest - generate identity, commit identity, airdrop
              isProofReceived &&
              <Register proofObj={proofObj!} userAddr={address!}/>
            }

          </div>
        </div>

        { // Code Logo
          !(template && isTemplateOk && !isProofReceived) && 
          <div className='rightside'></div>
        }

        { // Show the QR code only when it has to be shown
          template && isTemplateOk && !isProofReceived && 
          <div className='rightside2'>
            <div className='QR-black'>
              <div className='QR-white'>
                <a href={template} target="_blank" rel="noopener noreferrer" title={template}>
                  <QRCode
                    size={256}
                    value={template}
                    fgColor="#000"
                    bgColor="#fff"
                    className='QR-resize'
                  />
                </a>
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  )
}

export default App;
